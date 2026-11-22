import { BaseError } from "../base";

/** 503 — the database or an upstream service didn't answer. Also what anything unexpected is reported as (see the error handler). */
export class ServiceUnavailableError extends BaseError {
  readonly status = 503;
  readonly code = "service-unavailable" as const;
}
