import "server-only";

import { RateLimitedException } from "../../domain/exceptions";
import type {
  RateLimiter,
  RateLimitRule,
} from "../../domain/ports/rate-limiter.port";

/**
 * Applying a rate limit in a route handler.
 *
 * The counting itself lives in Postgres (migration 015) so the limit is shared
 * across every instance — an earlier version of this file kept a Map in
 * process memory, which meant the real limit was the configured one multiplied
 * by however many serverless functions happened to be warm.
 *
 * The thresholds stay here in code rather than in the database: changing one
 * should be a code review, not a migration.
 */

export const RATE_LIMITS = {
  /**
   * Loose enough not to catch someone genuinely mistyping their password a few
   * times, tight enough that this is not a comfortable place to guess from.
   */
  login: { limit: 10, windowSeconds: 15 * 60 },

  /**
   * Tight: this is the one unauthenticated endpoint that causes email to be
   * sent, so an unbounded one is a way to use the app as a spam relay against a
   * chosen address — and to burn its sending reputation doing so.
   */
  resendVerification: { limit: 3, windowSeconds: 15 * 60 },

  /**
   * Registration writes a row and costs ~250ms of hashing per call, so it is
   * both a storage and a CPU target.
   */
  register: { limit: 5, windowSeconds: 15 * 60 },

  /**
   * Tightest of the lot. A reset link grants an outright credential change, so
   * an unbounded endpoint is both a spam vector against a chosen inbox and a
   * way to keep a fresh link in flight indefinitely.
   */
  requestPasswordReset: { limit: 3, windowSeconds: 15 * 60 },

  /**
   * Guessing a 256-bit token is not realistic, but an unbounded endpoint that
   * hashes a password on every call is a cheap way to burn CPU.
   */
  resetPassword: { limit: 10, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Identifies the caller.
 *
 * Keyed on IP, which is spoofable — so this bounds honest mistakes and casual
 * abuse rather than a determined distributed attacker. That is a real limit and
 * worth stating; the alternative of keying on the submitted email would be
 * worse, since it would let anyone lock a chosen account out of its own login
 * by exhausting that address's bucket.
 */
export function rateLimitKey(
  action: string,
  identifier: string | null,
): string {
  return `${action}:${identifier ?? "unknown"}`;
}

/**
 * Throws `RateLimitedException` when the caller is over the limit.
 *
 * ── Fails open ──────────────────────────────────────────────
 * If the limiter itself errors — the database being briefly unreachable — the
 * request is allowed through. The alternative fails closed, which turns a
 * transient database problem into "nobody can sign in", converting a degraded
 * service into an outage. A brief window of unlimited attempts is the lesser
 * harm, and it is logged.
 */
export async function enforceRateLimit(
  limiter: RateLimiter,
  key: string,
  rule: RateLimitRule,
): Promise<void> {
  let verdict;

  try {
    verdict = await limiter.consume(key, rule);
  } catch (error) {
    console.error("[auth/rate-limit] check failed, allowing request", {
      key,
      error,
    });
    return;
  }

  if (!verdict.allowed) {
    throw new RateLimitedException(verdict.retryAfterSeconds);
  }
}
