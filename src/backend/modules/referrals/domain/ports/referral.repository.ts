import type { Referral } from "../referral.entity";

export interface ReferralRepository {
    /**
     * Records that `referredId` joined through `code`, if every rule holds:
     * the code belongs to someone else, the account is within the attribution
     * window, and it has not been referred before.
     *
     * One statement, so the checks and the write cannot race. Returns whether a
     * referral was recorded; `false` covers every reason it was not.
     */
    claim(referredId: string, code: string, windowDays: number): Promise<boolean>;

    /** The people `referrerId` has referred, newest first. */
    listForReferrer(referrerId: string): Promise<Referral[]>;
}
