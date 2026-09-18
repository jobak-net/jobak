import "server-only";

import type {
  RateLimiter,
  RateLimitRule,
  RateLimitVerdict,
} from "../../domain/ports/rate-limiter.port";
import { query } from "../database";

interface ConsumeRow {
  current_count: number;
  window_started_at: Date;
}

/**
 * Postgres-backed rate limiting.
 *
 * Replaces an in-memory Map that was per-instance and reset by every deploy —
 * so on serverless the effective limit was the configured one times however
 * many functions were warm, and spreading requests across instances earned a
 * fresh budget from each.
 *
 * The counting and the reset-on-expiry both happen inside
 * `consume_rate_limit()` (migration 015) as a single statement, so concurrent
 * callers serialise on the row rather than racing.
 */
export class PgRateLimiter implements RateLimiter {
  /**
   * How often to opportunistically clear out expired rows.
   *
   * The table grows one row per distinct key, and keys contain client-supplied
   * IPs — so without a sweep this is attacker-controlled growth. Doing it on a
   * fraction of calls avoids needing pg_cron, at the cost of the occasional
   * slower request.
   */
  private static readonly SWEEP_PROBABILITY = 0.01;

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitVerdict> {
    const rows = await query<ConsumeRow>(
      `SELECT * FROM consume_rate_limit($1, make_interval(secs => $2))`,
      [key, rule.windowSeconds],
    );

    const row = rows[0];

    /*
     * The function always returns a row, so this is defensive rather than
     * expected. Failing open is the deliberate choice: a limiter that cannot
     * read its own state should not lock every user out of signing in.
     */
    if (!row) {
      console.error("[auth/rate-limit] consume returned no row", { key });
      return { allowed: true, count: 0, retryAfterSeconds: 0 };
    }

    const count = Number(row.current_count);
    const windowEndsAt =
      row.window_started_at.getTime() + rule.windowSeconds * 1000;

    this.maybeSweep();

    return {
      allowed: count <= rule.limit,
      count,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowEndsAt - Date.now()) / 1000),
      ),
    };
  }

  /**
   * Fire-and-forget: a failed sweep must never fail the request that triggered
   * it. The rows it would have removed are expired and harmless — they cost
   * storage, not correctness.
   */
  private maybeSweep(): void {
    if (Math.random() >= PgRateLimiter.SWEEP_PROBABILITY) return;

    void query("SELECT sweep_rate_limits()").catch((error) =>
      console.error("[auth/rate-limit] sweep failed", error),
    );
  }
}
