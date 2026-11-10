/**
 * Referral codes and the cookie that carries one through sign-up.
 *
 * Imports only from `@/shared`, so the proxy can read this as well as the
 * server code.
 */
import { REFERRAL_COOKIE } from "@/shared/referral-cookie";

/** Re-exported so backend code keeps one import for everything referral. */
export { REFERRAL_COOKIE };

/**
 * A user's code: the first 10 hex characters of their id. Must match the
 * generated `users.referral_code` column in `019_referrals.sql` exactly, or
 * links would stop resolving.
 */
export function referralCodeFor(userId: string): string {
    return userId.replace(/-/g, "").slice(0, 10).toLowerCase();
}

/** What a code can look like. Anything else in `?ref=` is ignored, not stored. */
export const REFERRAL_CODE_PATTERN = /^[0-9a-f]{10}$/;

export function isReferralCode(value: unknown): value is string {
    return typeof value === "string" && REFERRAL_CODE_PATTERN.test(value);
}

/** Long enough to cover "opened the link, signed up a few days later". */
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Only accounts this new can be attributed. Stops an existing user from being
 * claimed as a referral just by opening a friend's link months after joining.
 */
export const REFERRAL_ATTRIBUTION_WINDOW_DAYS = 7;
