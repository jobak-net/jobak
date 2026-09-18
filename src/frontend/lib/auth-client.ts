/**
 * Calling the auth API from the browser.
 *
 * The forms used to invoke server actions directly; they now post to
 * `/api/v1/auth/*` instead. The practical difference is that tokens arrive as
 * httpOnly cookies set by the route, so nothing here ever sees or stores a
 * token — there is no client-side session state to keep in sync.
 */

export interface AuthApiError {
  error: string;
  /** Present on domain failures; absent on unexpected ones. */
  code?: string;
}

/** Thrown for any non-2xx response, carrying the server's own wording. */
export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

const GENERIC = "Something went wrong. Please try again.";

async function post<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      /*
       * The route sets httpOnly cookies on the response, and the browser only
       * stores them if the request was credentialed. Same-origin is the default
       * for fetch, but stating it makes the dependency explicit — a future move
       * to a different origin would otherwise break sign-in silently.
       */
      credentials: "same-origin",
    });
  } catch {
    // Network-level failure: offline, DNS, connection refused. No response body.
    throw new AuthRequestError(
      "We can't reach our servers right now. Check your connection and try again.",
      undefined,
      0,
    );
  }

  /*
   * A 204 or an HTML error page would both break `.json()`, and a parse error
   * here would surface as "Unexpected token <" — useless to the user and
   * misleading to whoever debugs it.
   */
  const data = (await response.json().catch(() => null)) as
    | (AuthApiError & Record<string, unknown>)
    | null;

  if (!response.ok) {
    throw new AuthRequestError(
      data?.error ?? GENERIC,
      data?.code,
      response.status,
    );
  }

  return data as T;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
}

export const login = (email: string, password: string) =>
  post<{ user: AuthUser }>("/api/v1/auth/login", { email, password });

export const register = (input: {
  email: string;
  password: string;
  fullName?: string;
}) =>
  post<{ email: string; verificationRequired: boolean }>(
    "/api/v1/auth/register",
    input,
  );

export const logout = () => post<{ success: true }>("/api/v1/auth/logout");

export const resendVerification = (email: string) =>
  post<{ message: string }>("/api/v1/auth/resend-verification", { email });

export const requestPasswordReset = (email: string) =>
  post<{ message: string }>("/api/v1/auth/request-password-reset", { email });

export const resetPassword = (token: string, password: string) =>
  post<{ success: true }>("/api/v1/auth/reset-password", { token, password });

/**
 * Only same-site absolute paths are followed.
 *
 * `?next=` comes from the URL, so without this check anyone could send a link
 * to `/login?next=https://evil.example` and have the app redirect there after a
 * successful sign-in — an open redirect wearing the credibility of a real login.
 *
 * `//evil.example` is rejected too: it looks relative but browsers read it as
 * protocol-relative and leave the site.
 */
export function safeNext(raw: string | null, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
