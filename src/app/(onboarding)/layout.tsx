import type { Metadata } from "next";

import { requireUser, UserLookupError } from "@/backend/modules/auth/interface";
import { LoadFailed } from "@/frontend/components/dashboard/load-failed";

export const metadata: Metadata = {
  title: "Get started — Jobak",
  robots: { index: false },
};

/**
 * Onboarding gets its own route group so it is full-screen: no dashboard
 * sidebar, no site navigation — one question at a time, nothing else to click.
 *
 * Same gate as the dashboard: signed out with Clerk redirects to /login; with
 * auth disabled the local owner passes straight through; a failed user lookup
 * shows the retry screen rather than a sign-in redirect loop.
 *
 * Where someone belongs within onboarding — the job questions, or connecting
 * their AI — is each page's decision (`_lib/onboarding-status.ts`), because
 * the two pages send people in opposite directions.
 */
export default async function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UserLookupError) return <LoadFailed />;
    throw error;
  }

  return children;
}
