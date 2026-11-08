import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

import { authFormAppearance } from "@/frontend/lib/configs/clerk-appearance";
import { SIGN_UP_HREF } from "@/frontend/lib/configs/cta";

export const metadata: Metadata = {
  title: "Sign in — Jobak",
  robots: { index: false },
};

/**
 * Clerk's sign-in, at /login.
 *
 * Optional catch-all because the flow has steps of its own — verification
 * codes, second factors, SSO callbacks — that Clerk routes beneath this path.
 * Suspense because the component reads the URL to know which step it is on.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <SignIn path="/login" signUpUrl={SIGN_UP_HREF} appearance={authFormAppearance} />
    </Suspense>
  );
}
