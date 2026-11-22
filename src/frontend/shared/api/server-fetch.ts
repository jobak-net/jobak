import "server-only";

import { headers } from "next/headers";

import { failureFrom, malformedSuccess, networkFailure, type FetchOptions, type FetchResult } from "./fetch-result";

/**
 * The frontend's one way to call the backend from the server (server
 * components, layouts, guards). Consumers only pick a path and a type:
 *
 *   const result = await serverFetch<AccountStatus>(ACCOUNT_API_PATH);
 *
 * Everything about *how* the backend is reached lives here and nowhere else,
 * so moving the backend to another service or technology means changing this
 * file and one env var:
 *
 *  - **Where:** `API_BASE_URL` when set (e.g. `https://api.example.com`),
 *    otherwise this deployment's own origin — today the API routes are part of
 *    the same Next app.
 *  - **Who is asking:** a server-side fetch doesn't carry the browser's
 *    cookies by itself, so the visitor's `cookie` header is forwarded; that is
 *    how the backend (Clerk's session) knows the user. A backend on another
 *    domain would rather get just the session token as
 *    `Authorization: Bearer …` — switch it here when that happens. The
 *    visitor's `x-forwarded-for` goes along too, for per-address rate limits.
 *  - **Freshness:** never cached. The answers are per-user.
 */

/** The same result shape as `clientFetch`'s (see `./fetch-result.ts`). */
export type ServerFetchResult<T> = FetchResult<T>;
export type ServerFetchOptions = FetchOptions;

/** `API_BASE_URL`, or this deployment's origin as the request saw it. */
function apiBaseUrl(incoming: Headers): string {
  const configured = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  // Behind a reverse proxy the original host and scheme arrive as `x-forwarded-*`.
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const proto = incoming.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

export async function serverFetch<T>(
  path: string,
  { method = "GET", body }: ServerFetchOptions = {},
): Promise<ServerFetchResult<T>> {
  const incoming = await headers();

  const outgoing: Record<string, string> = { accept: "application/json" };
  const cookie = incoming.get("cookie");
  if (cookie) outgoing.cookie = cookie;
  // The visitor's address, so per-address rate limits count the visitor —
  // not this server, which would put every page view in one shared bucket.
  const forwardedFor = incoming.get("x-forwarded-for");
  if (forwardedFor) outgoing["x-forwarded-for"] = forwardedFor;
  if (body !== undefined) outgoing["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl(incoming)}${path}`, {
      method,
      headers: outgoing,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[server-fetch] ${method} ${path}: backend unreachable`, error);
    return networkFailure();
  }

  if (!response.ok) {
    const failure = await failureFrom(response);
    if (failure.kind === "failed") console.error(`[server-fetch] ${method} ${path}: ${response.status} ${failure.code}`);
    return failure;
  }

  try {
    // Trusted, not validated: the shape is the shared contract the backend answers with.
    return { kind: "ok", data: (await response.json()) as T };
  } catch (error) {
    console.error(`[server-fetch] ${method} ${path}: response is not JSON`, error);
    return malformedSuccess(response.status);
  }
}
