import { BaseError } from "../base";

/**
 * 429 — the user's AI provider is throttling their key (its own quota, not
 * ours: our limits throw `TooManyRequestsError`). `Retry-After` is passed on
 * when the provider sent one.
 */
export class AiProviderLimitedError extends BaseError {
  readonly status = 429;
  readonly code = "ai-provider-limited" as const;

  constructor(
    detail?: string,
    /** Seconds until a new attempt can succeed, when the provider said. */
    readonly retryAfterSeconds?: number,
  ) {
    super(detail);
  }

  override get headers() {
    return this.retryAfterSeconds ? { "Retry-After": String(this.retryAfterSeconds) } : undefined;
  }
}
