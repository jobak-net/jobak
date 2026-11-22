import { OverviewView } from "@/frontend/modules/dashboard";
import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { loadJobs } from "@/frontend/modules/job-search/server";
import { firstNameOf } from "@/frontend/shared/lib";

/** /dashboard — the overview. What it shows, and why, is `OverviewView`. */
export default async function DashboardPage() {
  // Onboarding is done by the time anyone gets here — the layout sends
  // everyone else to /onboarding — so what varies is whether matches exist yet.
  const [user, { jobs, sample }] = await Promise.all([requireDashboardUser(), loadJobs()]);

  return <OverviewView firstName={firstNameOf(user.fullName)} jobs={jobs} sample={sample} />;
}
