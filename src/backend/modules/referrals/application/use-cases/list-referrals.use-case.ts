import type { Referral } from "../../domain/referral.entity";
import type { ReferralRepository } from "../../domain/ports/referral.repository";

/** The friends a user has referred, for their referral page. */
export class ListReferralsUseCase {
    constructor(private readonly referrals: ReferralRepository) {}

    execute(referrerUserId: string): Promise<Referral[]> {
        return this.referrals.listForReferrer(referrerUserId);
    }
}
