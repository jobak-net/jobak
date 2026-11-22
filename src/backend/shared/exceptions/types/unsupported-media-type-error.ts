import { BaseError } from "../base";

/** 415 — a body that wasn't sent as JSON. */
export class UnsupportedMediaTypeError extends BaseError {
  readonly status = 415;
  readonly code = "unsupported-media-type" as const;
}
