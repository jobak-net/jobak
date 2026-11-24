import { BaseError } from "../base";

/** 404 — no such thing (or the feature is off on this instance). */
export class NotFoundError extends BaseError {
  readonly status = 404;
  readonly code = "not-found" as const;
}
