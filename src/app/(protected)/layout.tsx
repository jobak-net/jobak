import type { Metadata } from "next";

import { LoadFailed } from "@/frontend/shared/components";
import { DashboardShell } from "@/frontend/modules/dashboard";
import { resolveDashboardAccess } from "@/frontend/modules/dashboard/server";

export const metadata: Metadata = {
  title: "Dashboard — Jobak",
  robots: { index: false },
};

/**
 * Everything under /dashboard: asks whether this visitor may see it
 * (`frontend/modules/dashboard/api/dashboard-access.guard.ts`), then renders the shell.
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
