/**
 * What `serverFetch` and `clientFetch` both return, so a caller handles a
 * backend answer the same way wherever it ran.
 */
export type FetchResult<T> =
  | { kind: "ok"; data: T }
  /** 401: nobody is signed in. */
  | { kind: "unauthorized" }
  /**
   * Anything else: an error status, an unreachable backend (`status: null`),
   * or a body that isn't JSON. "Couldn't tell", never "signed out".
   */
  | { kind: "failed"; status: number | null };

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
}
