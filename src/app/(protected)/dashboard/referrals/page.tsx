import { headers } from "next/headers";

import { requireUser } from "@/backend/modules/auth/interface";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import { Contribute } from "@/frontend/components/dashboard/contribute";
import { ReferralPanel } from "@/frontend/components/dashboard/referral-panel";
import { PageHeader } from "@/frontend/components/ui";
import { SIGN_UP_HREF } from "@/frontend/lib/configs/cta";
import { getReferralsModule, referralCodeFor } from "@/backend/modules/referrals";

/**
 * The origin to build the link on, from the request itself.
 *
 * Not the hard-coded `metadataBase`: a self-hosted or staging instance has its
 * own domain, and a referral link pointing at someone else's site is useless.
 * Behind a proxy the original host and scheme arrive as `x-forwarded-*`.
 */
async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto =
    list.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** "7 Nov 2026" — a date, not a relative time, so it does not go stale on a cached page. */
const formatJoined = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);

export default async function ReferralsPage() {
  const user = await requireUser();

  if (!isAuthEnabled()) {
    // Someone self-hosting is the likeliest contributor of all, so they still get the invitation.
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

  const link = `${await requestOrigin()}${SIGN_UP_HREF}?ref=${referralCodeFor(user.id)}`;

  /*
   * A failure to read the list should not cost the user their link, which is
   * the part of this page they came for. The panel says the list is missing.
   */
  let referrals: { displayName: string | null; joined: string }[] | null;
  try {
    referrals = (await getReferralsModule().list.execute(user.id)).map((r) => ({
      displayName: r.displayName,
      joined: formatJoined(r.joinedAt),
    }));
  } catch (error) {
    console.error("[referrals] list failed", error);
    referrals = null;
  }

  return (
    <>
      <PageHeader
        title="Refer a friend"
        description="Know someone looking for work? Send them your link and Jobak does the searching for them too."
      />
      <ReferralPanel link={link} referrals={referrals} />
      <div className="mt-12 border-t border-border-subtle pt-10">
        <Contribute title="Another way to help" />
      </div>
    </>
  );
}
