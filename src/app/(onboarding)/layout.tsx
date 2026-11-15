import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — Jobak",
  robots: { index: false },
};

/**
 * Onboarding gets its own route group so it is full-screen: no dashboard
 * sidebar, no site navigation — one question at a time, nothing else to click.
 *
 * No gate here. Each page asks `resolveOnboardingAccess()`
 * (`frontend/lib/guards/onboarding-access.ts`) for its own step, because the
 * two pages send people in opposite directions — and that check covers signed
 * out and "couldn't tell" as well.
 */
export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
