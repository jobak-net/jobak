import { ERROR_MESSAGES, type ErrorCode } from "@/shared/errors";

/**
 * The base of every exception the backend throws on purpose.
 *
 * Not tied to HTTP: a use case, a repository or an entity can throw one. It
 * carries what a response needs — the status and the shared error code — so
 * the API's error handler (`shared/http/middlewares/with-error-handler.ts`)
 * can answer the same way for all of them.
 *
 * What a user reads is always `ERROR_MESSAGES[code]` (`@/shared/errors`), the
 * same text the frontend shows. `detail` is for developers — which field,
 * which step — and goes in the response's `detail`, never in front of a user.
 */
export abstract class BaseError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;

  constructor(readonly detail?: string) {
    super(detail);
    this.name = new.target.name;
  }

  /** What the user is shown: the shared message for this code. */
  get userMessage(): string {
    return ERROR_MESSAGES[this.code];
  }
}
