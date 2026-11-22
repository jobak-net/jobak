import { BaseError } from "../base";

/**
 * 429 — too many requests in a short time. Not retried by the frontend:
 * waiting is the fix, and `Retry-After` says how long when it's known.
 */
export class TooManyRequestsError extends BaseError {
  readonly status = 429;
  readonly code = "rate-limited" as const;

  constructor(
    detail?: string,
    /** Seconds until a new attempt can succeed, when known. */
    readonly retryAfterSeconds?: number,
  ) {
    super(detail);
  }

  override get headers() {
    return this.retryAfterSeconds ? { "Retry-After": String(this.retryAfterSeconds) } : undefined;
  }
}
