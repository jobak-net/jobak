import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/backend/modules/auth/interface";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import { getReferralsModule, REFERRAL_COOKIE } from "@/backend/modules/referrals";

/**
 * POST /api/v1/referrals/claim
 *
 * Attributes the signed-in account to whoever referred it, using the code the
 * sign-up link left in the `jobak_ref` cookie. The dashboard calls this once
 * when it sees that cookie.
 *
 * Whether or not a referral is recorded, the cookie is cleared afterwards —
 * an ineligible claim (own code, account too old, already referred) will not
 * become eligible by asking again. The one exception is a server error, where
 * the cookie is kept so the next visit retries.
 *
 * Rules live in the claim itself (see `PgReferralRepository.claim`); this
 * handler only supplies who is asking and which code.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST() {
  // No accounts, no referrals.
  if (!isAuthEnabled()) return new NextResponse(null, { status: 404 });

  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value;
  if (!code) return NextResponse.json({ claimed: false }, { headers: noStore });

  // Signed out: leave the cookie for after they sign in.
  const { user, response } = await requireApiUser();
  if (!user) return response;

  let claimed: boolean;
  try {
    claimed = await getReferralsModule().claim.execute(user.id, code);
  } catch (error) {
    console.error("[referrals/claim] failed", error);
    return NextResponse.json({ error: "Could not record the referral" }, { status: 500, headers: noStore });
  }

  store.delete(REFERRAL_COOKIE);
  return NextResponse.json({ claimed }, { headers: noStore });
}
