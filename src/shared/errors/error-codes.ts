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
  /** 422 — the user's AI provider refused their key (revoked, wrong, out of credit). */
  | "ai-key-rejected"
  /** 409 — the AI needs a saved key the user doesn't have (none connected, or not that provider). */
  | "ai-not-connected"
  /** 429 — the user's AI provider is throttling their key; our own limits are `rate-limited`. */
  | "ai-provider-limited"
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
  "ai-key-rejected": "Your AI provider didn't accept that key. Check it, or create a new key and add it again.",
  "ai-not-connected": "Your AI isn't connected. Add your key in Settings, under AI provider.",
  "ai-provider-limited": "Your AI provider is limiting requests on your key. Give it a minute and try again.",
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
