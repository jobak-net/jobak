import { redirect } from "next/navigation";

import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";

/**
 * Shell for /login and /register: the logo, and the Clerk form centred.
 *
 * No site navigation on purpose — someone mid sign-in has one thing to do, and
 * the logo is the way back out.
 *
 * With auth disabled there is no sign-in to show (and no ClerkProvider for the
 * form to work under), so these routes send the visitor home, where they are
 * already the owner.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isAuthEnabled()) redirect("/");

  return (
    <main className="relative min-h-screen flex flex-col items-center px-6 py-10 noise-overlay">
      <JobakLogo showText />
      <div className="flex-1 w-full flex items-center justify-center py-10">
        {children}
      </div>
    </main>
  );
}
