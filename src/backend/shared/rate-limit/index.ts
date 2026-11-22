import "server-only";

import type { RateLimitDecision } from "@/backend/shared/types/rate-limit";

import { PgRateLimitStore } from "./pg-rate-limit.store";
import type { RateLimitPolicyName } from "./policies";
import { RateLimiter } from "./rate-limiter";

/**
 * The shared rate limiter. Guide: `docs/backend/RATE_LIMIT.md`.
 *
 *   policies.ts             every integration's default limit, by name
 *   config.ts               RATE_LIMIT_<NAME> overrides from the environment
 *   rate-limiter.ts         counting and deciding (store injected)
 *   pg-rate-limit.store.ts  the counts, in Postgres
 *
 * Routes use it through `withMiddlewares({ rateLimit: "<name>" })`. Code that
 * calls an outside service uses it directly:
 *
 *   await enforceRateLimit("openai", userId); // throws a 429 when over
 */

const globalForRateLimit = globalThis as unknown as { rateLimiter?: RateLimiter };

export function getRateLimiter(): RateLimiter {
    globalForRateLimit.rateLimiter ??= new RateLimiter(new PgRateLimitStore());
    return globalForRateLimit.rateLimiter;
}

/** Counts one call against `policy` for `key`; throws `TooManyRequestsError` when it's over the limit. */
export function enforceRateLimit(policy: RateLimitPolicyName, key: string): Promise<RateLimitDecision | null> {
    return getRateLimiter().enforce(policy, key);
}

export { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "./policies";
export { secondsUntil } from "./rate-limiter";
