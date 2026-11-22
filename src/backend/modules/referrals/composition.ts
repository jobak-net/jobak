import "server-only";

import { ClaimReferralUseCase } from "./application/use-cases/claim-referral.use-case";
import { GetReferralInviteUseCase } from "./application/use-cases/get-referral-invite.use-case";
import { PgReferralRepository } from "./infrastructure/referral.repository";

/**
 * The referrals module's composition root. Same pattern as auth: one place
 * picks the implementations, cached per process because the objects are
 * stateless and Next's dev server re-evaluates modules on every reload.
 *
 * Bump `VERSION` when the module's shape changes, or a dev server keeps
 * serving the cached object without the new use case.
 */
export interface ReferralsModule {
    claim: ClaimReferralUseCase;
    invite: GetReferralInviteUseCase;
}

const VERSION = 2;

const globalForReferrals = globalThis as unknown as {
    referralsModule?: { module: ReferralsModule; version: number };
};

export function getReferralsModule(): ReferralsModule {
    if (globalForReferrals.referralsModule?.version !== VERSION) {
        const repository = new PgReferralRepository();
        globalForReferrals.referralsModule = {
            version: VERSION,
            module: {
                claim: new ClaimReferralUseCase(repository),
                invite: new GetReferralInviteUseCase(repository),
            },
        };
    }
    return globalForReferrals.referralsModule.module;
}
