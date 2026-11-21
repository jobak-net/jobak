import { ERROR_MESSAGES, isErrorCode, type ErrorCode } from "@/shared/errors/error-codes";

/**
 * What `serverFetch` and `clientFetch` both return, so a caller handles a
 * backend answer the same way wherever it ran.
 *
 * A failure always carries a shared error `code` and its `message` — the same
 * words the backend sent (`@/shared/errors/error-codes`), never wording of the
 * frontend's own.
 */
export type FetchResult<T> =
  | { kind: "ok"; data: T }
  /** 401: nobody is signed in. Kept apart because it means "go sign in", never "retry". */
  | { kind: "unauthorized"; code: "unauthorized"; message: string }
  /**
   * Anything else: an error status, an unreachable backend (`status: null`,
   * code `network`), or a body that isn't JSON. "Couldn't tell", never
   * "signed out".
   */
  | { kind: "failed"; status: number | null; code: ErrorCode; message: string };

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
}

/** The status's code when a response didn't say (a proxy's HTML error page, say). */
function codeForStatus(status: number): ErrorCode {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 415) return "unsupported-media-type";
  if (status === 500) return "internal";
  return "service-unavailable";
}

/** Turns any non-2xx response into the failure result, reading the backend's `code` when it sent one. */
export async function failureFrom(response: Response): Promise<Exclude<FetchResult<never>, { kind: "ok" }>> {
  let code: ErrorCode = codeForStatus(response.status);
  try {
    const body: unknown = await response.json();
    const sent = (body as { code?: unknown } | null)?.code;
    if (isErrorCode(sent)) code = sent;
  } catch {
    /* not JSON — keep the status's code */
  }

  if (code === "unauthorized") return { kind: "unauthorized", code, message: ERROR_MESSAGES.unauthorized };
  return { kind: "failed", status: response.status, code, message: ERROR_MESSAGES[code] };
}

/** The failure result when there was no response at all. */
export function networkFailure(): Extract<FetchResult<never>, { kind: "failed" }> {
  return { kind: "failed", status: null, code: "network", message: ERROR_MESSAGES.network };
}

/** A 2xx whose body isn't the JSON the contract promised. */
export function malformedSuccess(status: number): Extract<FetchResult<never>, { kind: "failed" }> {
  return { kind: "failed", status, code: "internal", message: ERROR_MESSAGES.internal };
}
