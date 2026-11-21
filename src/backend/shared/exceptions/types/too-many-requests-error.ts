import { BaseError } from "../base";

/** 429 — too many requests in a short time. Not retried by the frontend: waiting is the fix. */
export class TooManyRequestsError extends BaseError {
  readonly status = 429;
  readonly code = "rate-limited" as const;
}
