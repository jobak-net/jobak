import { BaseError } from "../base";

/** 400 — the request (body, query, route params) doesn't match what's expected. `detail` names the fields. */
export class ValidationError extends BaseError {
  readonly status = 400;
  readonly code = "validation" as const;
}
