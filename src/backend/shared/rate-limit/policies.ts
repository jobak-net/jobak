import type { RateLimitPolicy } from "@/backend/shared/types/rate-limit";

/**
 * Every integration's default rate limit, by name — the one place to look up
 * or change how often something may happen.
 *
 * Two kinds, same shape:
 *  - **Our API**, per route: protects us. A route picks one with
 *    `withMiddlewares({ rateLimit: "<name>" })`; `by` says who is counted.
 *  - **Services we call** (AI providers, outside APIs): keeps us under their
 *    quota. Code that calls one runs `enforceRateLimit("<name>", key)` first.
 *    Name it after the service, set it from the service's documented limit,
 *    and leave headroom.
 *
 * Each default can be changed per environment without a code change:
 * `RATE_LIMIT_<NAME>` (dots and dashes as `_`, upper case) set to `<limit>/<window>`
 * — `30/1m`, `5/10s`, `1000/1h` — or `off`. See `config.ts`.
 */
export const RATE_LIMIT_POLICIES = {
    /* ── Our API ─────────────────────────────────────────────── */

    /** The public feedback form. Backed by the database's own flood guard (011_feedback.sql). */
    feedback: { limit: 3, windowSeconds: 60, by: "user" },

    /** The public talent directory: a page view is one call. */
    talent: { limit: 60, windowSeconds: 60, by: "ip" },

    /** Title search as you type (debounced in the browser). */
    "job-titles": { limit: 120, windowSeconds: 60, by: "user" },

    /** Claiming a referral code: a handful per minute is plenty for a person, too few to guess codes. */
    "referrals.claim": { limit: 10, windowSeconds: 60, by: "user" },

    /* ── Services we call ────────────────────────────────────── */
    // e.g.  openai: { limit: 500, windowSeconds: 60 },  — then `enforceRateLimit("openai", userId)`
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;
