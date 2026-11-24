import { BaseError } from "../base";

/** 403 — signed in, but not allowed to do this. */
export class ForbiddenError extends BaseError {
  readonly status = 403;
  readonly code = "forbidden" as const;
}
