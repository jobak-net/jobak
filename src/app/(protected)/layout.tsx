import type { Metadata } from "next";

import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { DashboardShell } from "@/frontend/components/dashboard/shell/dashboard-shell";
import { resolveDashboardAccess } from "@/frontend/lib/guards/dashboard-access";

export const metadata: Metadata = {
  title: "Dashboard — Jobak",
  robots: { index: false },
};

/**
 * Everything under /dashboard: asks whether this visitor may see it
 * (`frontend/lib/guards/dashboard-access.ts`), then renders the shell.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await resolveDashboardAccess();
  if (access.kind === "load-failed") return <LoadFailed />;

  return <DashboardShell user={access.user}>{children}</DashboardShell>;
}
