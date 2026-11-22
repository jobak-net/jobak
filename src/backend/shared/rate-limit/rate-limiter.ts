import { TooManyRequestsError } from "@/backend/shared/exceptions";
import type { RateLimitDecision, RateLimitStore } from "@/backend/shared/types/rate-limit";

import { resolvePolicy } from "./config";
import type { RateLimitPolicyName } from "./policies";

/** One call in this many also sweeps old buckets, so the table never needs a cron job. */
const SWEEP_EVERY = 200;

/**
 * Counts calls against the named policies (`policies.ts`).
 *
 * A fixed window per bucket (`<policy>:<key>`): the first call opens it, each
 * call counts, and the count starts over when the window has passed. Across a
 * window boundary a caller can get up to twice the limit — accepted, as in
 * 015_rate_limits.sql, for bounding abuse.
 *
 * **Fails open:** if the store can't be reached the call is allowed and the
 * failure logged. A limiter that takes the whole API down with the database
 * protects nothing — and the route would fail on the same database anyway.
 */
export class RateLimiter {
    private calls = 0;

    constructor(
        private readonly store: RateLimitStore,
        private readonly env: Record<string, string | undefined> = process.env,
    ) {}

    /** Counts one call. `null` when the policy is switched off, or the store couldn't count it. */
    async consume(policy: RateLimitPolicyName, key: string): Promise<RateLimitDecision | null> {
        const settings = resolvePolicy(policy, this.env);
        if (!settings) return null;

        let counted: { count: number; windowStartedAt: Date };
        try {
            counted = await this.store.consume(`${policy}:${key}`, settings.windowSeconds);
        } catch (error) {
            console.error(`[rate-limit] couldn't count ${policy}; allowing the call`, error);
            return null;
        }

        if (++this.calls % SWEEP_EVERY === 0) {
            this.store.sweep().catch((error) => console.error("[rate-limit] sweep failed", error));
        }

        return {
            allowed: counted.count <= settings.limit,
            limit: settings.limit,
            remaining: Math.max(0, settings.limit - counted.count),
            resetAt: new Date(counted.windowStartedAt.getTime() + settings.windowSeconds * 1000),
        };
    }

    /** Counts one call and throws `TooManyRequestsError` (429, with `Retry-After`) when it's over the limit. */
    async enforce(policy: RateLimitPolicyName, key: string): Promise<RateLimitDecision | null> {
        const decision = await this.consume(policy, key);
        if (decision && !decision.allowed) {
            throw new TooManyRequestsError(`Rate limit "${policy}" reached`, secondsUntil(decision.resetAt));
        }
        return decision;
    }
}

/** Whole seconds until `date`, at least 1 — what `Retry-After` and `RateLimit-Reset` carry. */
export function secondsUntil(date: Date): number {
    return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}
