import "server-only";

import { NextResponse } from "next/server";

import {
  AuthException,
  RateLimitedException,
  type AuthErrorCode,
} from "../../domain/exceptions";

/**
 * Turning domain exceptions into HTTP responses.
 *
 * One place, so a status code is decided per failure kind rather than per route
 * — and so no handler can accidentally return a raw error message. The shape
 * matches the rest of this API: `{ error: string }` on failure.
 */

/**
 * Status per failure.
 *
 * Note `email_not_verified` is 403, not 401. The credentials were accepted —
 * the account is simply not permitted through yet — and a 401 would invite a
 * client to retry with different credentials, which cannot help.
 *
 * `invalid_token` and `token_expired` are 400 rather than 401: the token is in
 * the URL of a link the user clicked, not an authorization header, so this is a
 * malformed request rather than a failed authentication.
 */
const STATUS_BY_CODE: Record<AuthErrorCode, number> = {
  invalid_credentials: 401,
  email_not_verified: 403,
  session_revoked: 401,
  session_reuse_detected: 401,
  email_taken: 409,
  weak_password: 400,
  invalid_email: 400,
  invalid_token: 400,
  token_expired: 400,
  rate_limited: 429,
};

/**
 * The failure response for an auth exception.
 *
 * `userMessage` is sent, never `message` — the latter carries developer detail
 * ("no account for address", "password mismatch") that is deliberately kept out
 * of responses.
 */
export function authErrorResponse(error: AuthException): NextResponse {
  const status = STATUS_BY_CODE[error.code] ?? 400;

  const headers: Record<string, string> = {
    // Never let an auth response be cached, by the browser or anything between.
    "Cache-Control": "no-store",
  };

  if (error instanceof RateLimitedException) {
    headers["Retry-After"] = String(error.retryAfterSeconds);
  }

  return NextResponse.json(
    { error: error.userMessage, code: error.code },
    { status, headers },
  );
}

/** Anything not recognised as a domain failure. */
export function unexpectedErrorResponse(
  context: string,
  error: unknown,
): NextResponse {
  // The real error goes to the log; the client gets nothing specific.
  console.error(`[auth/${context}]`, error);

  return NextResponse.json(
    { error: "Something went wrong on our end. Please try again." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Wraps a handler so every domain exception becomes its mapped response and
 * everything else becomes a 500.
 *
 * Without this each route would repeat the same try/catch, and the one that
 * forgot would leak a stack trace or return a 200 with an error body.
 */
export function withAuthErrors(
  context: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((error: unknown) => {
    if (error instanceof AuthException) return authErrorResponse(error);
    return unexpectedErrorResponse(context, error);
  });
}

export function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
