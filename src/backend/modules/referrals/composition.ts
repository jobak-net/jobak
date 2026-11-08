import "server-only";

import { ClaimReferralUseCase } from "./application/use-cases/claim-referral.use-case";
import { ListReferralsUseCase } from "./application/use-cases/list-referrals.use-case";
import { PgReferralRepository } from "./infrastructure/referral.repository";

/**
 * The referrals module's composition root. Same pattern as auth: one place
 * picks the implementations, cached per process because the objects are
 * stateless and Next's dev server re-evaluates modules on every reload.
 */
export interface ReferralsModule {
    claim: ClaimReferralUseCase;
    list: ListReferralsUseCase;
}

const globalForReferrals = globalThis as unknown as { referralsModule?: ReferralsModule };

export function getReferralsModule(): ReferralsModule {
    if (!globalForReferrals.referralsModule) {
        const repository = new PgReferralRepository();
        globalForReferrals.referralsModule = {
            claim: new ClaimReferralUseCase(repository),
            list: new ListReferralsUseCase(repository),
        };
    }
    return globalForReferrals.referralsModule;
}
