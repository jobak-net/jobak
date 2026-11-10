import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";

import { requireUser, UserLookupError } from "@/backend/modules/auth/interface";
import { hasCompletedOnboarding } from "@/backend/modules/preferences";
import { ONBOARDING_HREF } from "@/shared/routes";
import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { DashboardShell } from "@/frontend/components/dashboard/shell/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard — Jobak",
  robots: { index: false },
};

/** "Sam Smith" → "SS"; no name → first letter of the email; neither → "J". */
function initialsFor(fullName: string | null, email: string | null): string {
  const fromName = (fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return fromName || email?.charAt(0).toUpperCase() || "J";
}

/**
 * Everything under /dashboard requires a user.
 *
 * `requireUser()` is the real gate: signed out with Clerk, it redirects to
 * /login; with auth disabled it resolves to the local owner, so a self-hosted
 * instance needs no sign-in at all.
 *
 * Then onboarding: anyone who hasn't finished it — a new account, or the
 * local owner on a fresh install — is sent to /onboarding first, because the
 * dashboard has nothing to show without a search to run.
 *
 * That is a convenience, not a security check, which is why it can live in
 * the layout: layouts don't re-run on client navigation, and Next renders the
 * child page regardless — fine here, since the page only shows the user's own
 * data, and `requireUser()` (also called by each page) stays the real gate.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user;
  let onboarded: boolean;
  try {
    user = await requireUser();
    onboarded = await hasCompletedOnboarding(user.id);
  } catch (error) {
    /*
     * A failed lookup gets an error screen with Retry. Anything else, including
     * the sign-in redirect (which Next signals by throwing), goes on up.
     */
    if (error instanceof UserLookupError) return <LoadFailed />;
    unstable_rethrow(error); // the sign-in redirect, and any other Next.js signal
    // The onboarding status couldn't be read: retry rather than guess (see hasCompletedOnboarding).
    console.error("[dashboard] could not read onboarding status", error);
    return <LoadFailed />;
  }

  // Outside the try: redirect() works by throwing.
  if (!onboarded) redirect(ONBOARDING_HREF);

  return (
    <DashboardShell userInitials={initialsFor(user.fullName, user.email)}>
      {children}
    </DashboardShell>
  );
}
