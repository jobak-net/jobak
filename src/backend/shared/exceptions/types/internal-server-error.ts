import { BaseError } from "../base";

/** 500 — a bug: a state the code should never reach. */
export class InternalServerError extends BaseError {
  readonly status = 500;
  readonly code = "internal" as const;
}
