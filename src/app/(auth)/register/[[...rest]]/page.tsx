import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

import { authFormAppearance } from "@/frontend/lib/configs/clerk-appearance";
import { SIGN_IN_HREF } from "@/shared/routes";

export const metadata: Metadata = {
  title: "Create your account — Jobak",
  robots: { index: false },
};

/** Clerk's sign-up, at /register. Same shape as /login — see that page. */
export default function RegisterPage() {
  return (
    <Suspense>
      <SignUp path="/register" signInUrl={SIGN_IN_HREF} appearance={authFormAppearance} />
    </Suspense>
  );
}
