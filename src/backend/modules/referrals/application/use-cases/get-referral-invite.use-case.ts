import type { Referral } from "../../domain/referral.entity";
import { referralCodeFor } from "../../domain/referral-code";
import type { ReferralRepository } from "../../domain/ports/referral.repository";

export interface ReferralInvite {
    code: string;
    /** `null` when the list couldn't be read. */
    referrals: Referral[] | null;
}

/**
 * What a user's referral page shows: their code, and the friends who joined
 * with it.
 *
 * A failure to read the list must not cost the user their link, which is the
 * part of the page they came for — so it is logged and answered as `null`
 * rather than failing the whole request.
 */
export class GetReferralInviteUseCase {
    constructor(private readonly referrals: ReferralRepository) {}

    async execute(userId: string): Promise<ReferralInvite> {
        let referrals: Referral[] | null;
        try {
            referrals = await this.referrals.listForReferrer(userId);
        } catch (error) {
            console.error("[referrals] list failed", error);
            referrals = null;
        }
        return { code: referralCodeFor(userId), referrals };
    }
}
