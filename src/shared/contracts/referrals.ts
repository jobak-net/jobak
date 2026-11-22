/**
 * The contract of `GET /api/v1/referrals`: the signed-in user's referral code
 * and the friends who joined through it. Imports nothing (see
 * `src/shared/README.md`).
 *
 *   200  ReferralInvite
 *   401  { error }   nobody is signed in
 *   404  { error }   sign-in is off on this instance: no accounts, no referrals
 *
 * `referrals` is `null` when the list couldn't be read. The code still comes
 * back, so the page can show the link — the part people come for.
 */

export const REFERRALS_API_PATH = "/api/v1/referrals";

export interface ReferredFriend {
  /** "Omar K." — first name and last initial, or null. Never an email. */
  displayName: string | null;
  /** ISO 8601. */
  joinedAt: string;
}

export interface ReferralInvite {
  code: string;
  referrals: ReferredFriend[] | null;
}
