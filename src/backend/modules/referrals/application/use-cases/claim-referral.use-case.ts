import { isReferralCode, REFERRAL_ATTRIBUTION_WINDOW_DAYS } from "../../domain/referral-code";
import type { ReferralRepository } from "../../domain/ports/referral.repository";

/**
 * Attribute a new account to the person whose link brought them in.
 *
 * Called once, from the dashboard, with the code the sign-up link left in a
 * cookie. A malformed code is rejected here; every other rule (not yourself,
 * new accounts only, once per account) is enforced by the repository's single
 * statement, so concurrent calls cannot double-count.
 */
export class ClaimReferralUseCase {
    constructor(private readonly referrals: ReferralRepository) {}

    async execute(referredUserId: string, code: unknown): Promise<boolean> {
        if (!isReferralCode(code)) return false;
        return this.referrals.claim(referredUserId, code, REFERRAL_ATTRIBUTION_WINDOW_DAYS);
    }
}
