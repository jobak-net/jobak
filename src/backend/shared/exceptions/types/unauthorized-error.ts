import { BaseError } from "../base";

/** 401 — nobody is signed in. */
export class UnauthorizedError extends BaseError {
  readonly status = 401;
  readonly code = "unauthorized" as const;
}
