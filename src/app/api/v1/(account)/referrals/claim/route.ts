import { cookies } from "next/headers";

import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import { getReferralsModule, REFERRAL_COOKIE } from "@/backend/modules/referrals";
import { NotFoundError, UnauthorizedError } from "@/backend/shared/exceptions";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";

/**
 * POST /api/v1/referrals/claim
 *
 * Attributes the signed-in account to whoever referred it, using the code the
 * sign-up link left in the `jobak_ref` cookie. The dashboard calls this once
 * when it sees that cookie.
 *
 * Whether or not a referral is recorded, the cookie is cleared afterwards —
 * an ineligible claim (own code, account too old, already referred) will not
 * become eligible by asking again. The one exception is a server error (thrown,
 * so the cookie stays), and the next visit retries.
 *
 * Rules live in the claim itself (see `PgReferralRepository.claim`); this
 * handler only supplies who is asking and which code.
 *
 * `auth: "optional"`: with no cookie there's nothing to claim, signed in or not.
 */
export const dynamic = "force-dynamic";

export const POST = withMiddlewares(
  { label: "referrals.claim", auth: "optional", rateLimit: "referrals.claim" },
  async ({ user }): Promise<{ claimed: boolean }> => {
    // No accounts, no referrals.
    if (!isAuthEnabled()) throw new NotFoundError();

    const store = await cookies();
    const code = store.get(REFERRAL_COOKIE)?.value;
    if (!code) return { claimed: false };

    // Signed out: leave the cookie for after they sign in.
    if (!user) throw new UnauthorizedError();

    const claimed = await getReferralsModule().claim.execute(user.id, code);
    store.delete(REFERRAL_COOKIE);
    return { claimed };
  },
);
