import { PageHeader } from "@/frontend/shared/ui";

import { Contribute } from "../components/contribute";
import { ReferralPanel } from "../components/referral-panel";
import type { ReferralInviteView } from "../types/referrals.types";

/**
 * /dashboard/referrals. `invite` is the user's link and who joined through it;
 * `null` when sign-in is off on this instance, so there is no one to refer —
 * and someone self-hosting is the likeliest contributor of all, so they still
 * get the invitation to help.
 */
export function ReferralsView({ invite }: { invite: ReferralInviteView | null }) {
  if (!invite) {
    return (
      <>
        <PageHeader
          title="Refer a friend"
          description="Referrals need accounts, and sign-in is turned off on this instance, so there is no one to refer here."
        />
        <Contribute title="Another way to help" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Refer a friend"
        description="Know someone looking for work? Send them your link and Jobak does the searching for them too."
      />
      <ReferralPanel link={invite.link} referrals={invite.referrals} />
      <div className="mt-12 border-t border-border-subtle pt-10">
        <Contribute title="Another way to help" />
      </div>
    </>
  );
}
