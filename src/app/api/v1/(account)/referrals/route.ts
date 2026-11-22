import { getReferralsModule } from "@/backend/modules/referrals";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import { NotFoundError } from "@/backend/shared/exceptions";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { ReferralInvite } from "@/shared/contracts/referrals";

/**
 * GET /api/v1/referrals
 *
 * The signed-in user's referral code and who joined through it, for
 * /dashboard/referrals. Contract: `@/shared/contracts/referrals`.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "referrals.invite", auth: "required" },
  async ({ user }): Promise<ReferralInvite> => {
    // No accounts, no referrals.
    if (!isAuthEnabled()) throw new NotFoundError();

    const invite = await getReferralsModule().invite.execute(user.id);
    return {
      code: invite.code,
      referrals:
        invite.referrals?.map((r) => ({ displayName: r.displayName, joinedAt: r.joinedAt.toISOString() })) ?? null,
    };
  },
);
