import type { RateLimitPolicy } from "@/backend/shared/types/rate-limit";

import { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "./policies";

const UNIT_SECONDS = { s: 1, m: 60, h: 3600 } as const;

/** `RATE_LIMIT_<NAME>`: `job-titles` → `RATE_LIMIT_JOB_TITLES`, `referrals.claim` → `RATE_LIMIT_REFERRALS_CLAIM`. */
export function envVarFor(name: string): string {
    return `RATE_LIMIT_${name.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`;
}

/** `"30/1m"` → `{ limit: 30, windowSeconds: 60 }`; `"off"` → `"off"`; anything else → null (ignored). */
export function parseOverride(value: string): Pick<RateLimitPolicy, "limit" | "windowSeconds"> | "off" | null {
    const raw = value.trim().toLowerCase();
    if (raw === "off") return "off";
    const match = /^(\d+)\s*\/\s*(\d+)?\s*([smh])$/.exec(raw);
    if (!match) return null;
    const limit = Number(match[1]);
    const windowSeconds = Number(match[2] ?? 1) * UNIT_SECONDS[match[3] as keyof typeof UNIT_SECONDS];
    return limit > 0 && windowSeconds > 0 ? { limit, windowSeconds } : null;
}

/**
 * The settings in force for a policy: its default (`policies.ts`), unless the
 * environment overrides it. `null` means switched off.
 *
 * An override that doesn't parse is logged and ignored — a typo in an env var
 * must not silently remove a limit.
 */
export function resolvePolicy(
    name: RateLimitPolicyName,
    env: Record<string, string | undefined> = process.env,
): RateLimitPolicy | null {
    const defaults: RateLimitPolicy = RATE_LIMIT_POLICIES[name];
    const raw = env[envVarFor(name)];
    if (raw === undefined || raw.trim() === "") return defaults;

    const override = parseOverride(raw);
    if (override === "off") return null;
    if (override === null) {
        console.warn(`[rate-limit] ignoring ${envVarFor(name)}="${raw}": expected "<limit>/<window>" (30/1m) or "off"`);
        return defaults;
    }
    return { ...defaults, ...override };
}
