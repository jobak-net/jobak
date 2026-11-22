/**
 * Shapes of the shared rate limiter (`@/backend/shared/rate-limit`).
 */

/**
 * Who a limit counts, for a route's policy:
 *  - `ip`: the sender's address (public routes);
 *  - `user`: the signed-in user, else the address;
 *  - `global`: everyone together (a service's whole quota).
 *
 * Outbound policies ignore it — the caller passes the key (`enforceRateLimit`).
 */
export type RateLimitSubject = "ip" | "user" | "global";

/** One integration's settings: at most `limit` calls per `windowSeconds`, per subject. */
export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
  /** Default: `user` (the user when signed in, else the address). */
  by?: RateLimitSubject;
}

/** The outcome of counting one call. */
export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  /** Calls left in this window, never below 0. */
  remaining: number;
  /** When the window ends and the count starts over. */
  resetAt: Date;
}

/**
 * Where the counts live. A port: today Postgres (`consume_rate_limit`,
 * db/supabase/015_rate_limits.sql), shared by every server instance.
 */
export interface RateLimitStore {
  /** Counts one call against `key`, atomically; returns the count so far and when this window began. */
  consume(key: string, windowSeconds: number): Promise<{ count: number; windowStartedAt: Date }>;
  /** Deletes buckets whose window closed long ago. */
  sweep(): Promise<void>;
}
