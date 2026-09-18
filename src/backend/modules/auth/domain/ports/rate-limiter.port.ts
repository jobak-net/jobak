/**
 * Counting attempts against a key.
 *
 * A port because the storage matters to correctness here: an in-memory
 * implementation is per-instance and cannot enforce a shared limit, while a
 * database-backed one can. Keeping it behind an interface means a test can
 * supply a deterministic counter without reaching for Postgres.
 */

export interface RateLimitRule {
  /** Attempts permitted within the window. */
  limit: number;
  windowSeconds: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Attempts recorded in the current window, this one included. */
  count: number;
  /** Seconds until the window closes. Meaningful only when `allowed` is false. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  /**
   * Records an attempt and reports whether it is permitted.
   *
   * Recording happens whether or not the attempt is allowed — a caller that
   * keeps trying while limited keeps the counter climbing rather than sitting
   * exactly at the threshold.
   *
   * Implementations must make the read and the increment atomic. Doing them
   * separately lets concurrent callers all observe the same pre-increment count
   * and all conclude they are under the limit, which is precisely the case a
   * limiter exists to prevent.
   */
  consume(key: string, rule: RateLimitRule): Promise<RateLimitVerdict>;
}
