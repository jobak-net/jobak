import { ReferralsView } from "@/frontend/modules/referrals";
import { loadReferralInvite } from "@/frontend/modules/referrals/server";
import { isAuthEnabled } from "@/shared/auth";

/** /dashboard/referrals. With sign-in off there are no accounts to refer. */
export default async function ReferralsPage() {
  if (!isAuthEnabled()) return <ReferralsView invite={null} />;
  return <ReferralsView invite={await loadReferralInvite()} />;
}
