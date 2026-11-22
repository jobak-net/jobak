import "server-only";

import { queryOne } from "@/backend/shared/database";
import type { RateLimitStore } from "@/backend/shared/types/rate-limit";

/**
 * The counts in Postgres, so a limit holds across every server instance and
 * survives deploys. Both statements are functions from 015_rate_limits.sql:
 * `consume_rate_limit` counts (or starts a new window) in one atomic upsert —
 * concurrent calls can't all read the same count and all slip under — and
 * `sweep_rate_limits` deletes buckets idle for a day.
 */
export class PgRateLimitStore implements RateLimitStore {
    async consume(key: string, windowSeconds: number) {
        const row = await queryOne<{ current_count: number; window_started_at: Date }>(
            `SELECT current_count, window_started_at
               FROM consume_rate_limit($1, make_interval(secs => $2))`,
            [key, windowSeconds],
        );
        if (!row) throw new Error("consume_rate_limit returned no row");
        return { count: row.current_count, windowStartedAt: new Date(row.window_started_at) };
    }

    async sweep() {
        await queryOne(`SELECT sweep_rate_limits()`);
    }
}
