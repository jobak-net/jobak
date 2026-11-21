/**
 * Every kind of error the app can report, and the one message each shows —
 * the same words whether the backend sends it or the frontend shows it.
 * Imports nothing (see `src/shared/README.md`).
 *
 *  - The backend's exceptions (`src/backend/shared/exceptions/`) each carry a
 *    code; an error response is `{ error: ERROR_MESSAGES[code], code }`.
 *  - The frontend reads `code` from the response (`serverFetch` /
 *    `clientFetch`) and shows `ERROR_MESSAGES[code]` — never its own wording.
 *
 * To change what users read for an error, change it here.
 */

export type ErrorCode =
  /** 400 — the request didn't match what the route expects. */
  | "validation"
  /** 401 — nobody is signed in (or the session ended). */
  | "unauthorized"
  /** 403 — signed in, but not allowed. */
  | "forbidden"
  /** 404 — no such thing. */
  | "not-found"
  /** 415 — a body that wasn't sent as JSON. */
  | "unsupported-media-type"
  /** 429 — too many requests in a short time (a held-down button, a flood). */
  | "rate-limited"
  /** 503 — the database or an upstream service didn't answer. */
  | "service-unavailable"
  /** 500 — a bug on our side. */
  | "internal"
  /** Frontend only: no response at all (offline, the server unreachable). */
  | "network";

export const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  validation: "Something in that request isn't valid.",
  unauthorized: "Your session has ended. Sign in again.",
  forbidden: "You don't have access to that.",
  "not-found": "That doesn't exist.",
  "unsupported-media-type": "That request couldn't be read.",
  "rate-limited": "That's a lot at once. Give it a moment and try again.",
  "service-unavailable": "Couldn't do that right now. Try again in a moment.",
  internal: "Something went wrong on our side. Try again.",
  network: "Couldn't reach Jobak. Check your connection and try again.",
};

/** The body of every error response. */
export interface ErrorResponseBody {
  /** `ERROR_MESSAGES[code]` — what to show. */
  error: string;
  code: ErrorCode;
  /** For developers: which field, which step. Shown to nobody. */
  detail?: string;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, value);
}
