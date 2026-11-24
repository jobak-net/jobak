import { redirect } from "next/navigation";

import { AuthShell } from "@/frontend/modules/auth";
import { isAuthEnabled } from "@/shared/auth";

/**
 * /login and /register, inside the auth module's `AuthShell`.
 *
 * With auth disabled there is no sign-in to show (and no ClerkProvider for the
 * form to work under), so these routes send the visitor to the dashboard, where
 * they are already the owner.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isAuthEnabled()) redirect("/dashboard");

  return <AuthShell>{children}</AuthShell>;
}
