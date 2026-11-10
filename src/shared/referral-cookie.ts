/**
 * `src/shared/` holds what the frontend and the backend both need to agree on.
 * Files here import nothing from either side, so each side can import them
 * without depending on the other.
 */

/**
 * The cookie that holds a referral code from the moment someone opens a
 * referral link until their account exists.
 *
 * The proxy writes it (`backend/shared/middleware/referral-capture`), the dashboard
 * checks for it in the browser (`referral-claim.tsx`), and the claim route
 * reads and clears it. Readable by script on purpose, for that browser check.
 * It is a public code, not a credential, so nothing is exposed by that.
 */
export const REFERRAL_COOKIE = "jobak_ref";
