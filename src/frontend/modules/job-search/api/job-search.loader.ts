import "server-only";

import { serverFetch } from "@/frontend/shared/api/server";
import { SAMPLE_JOBS } from "@/frontend/shared/mocks/dashboard";
import { JOBS_API_PATH, type Job } from "@/shared/contracts/jobs";

/**
 * The user's jobs for the dashboard pages, or sample jobs until they have some.
 *
 * The backend (`GET /api/v1/jobs`) returns nothing until preferences exist —
 * there is nothing to narrow the pool by — which is every new account. Rather
 * than open on an empty dashboard, pages show sample jobs and say so via
 * `sample`.
 *
 * A failed read is treated the same way: the dashboard should still render if
 * the jobs database is briefly unreachable. (`serverFetch` logs the failure.)
 */
export async function loadJobs(): Promise<{ jobs: Job[]; sample: boolean }> {
  const result = await serverFetch<Job[]>(JOBS_API_PATH);
  if (result.kind === "ok" && result.data.length > 0) return { jobs: result.data, sample: false };
  return { jobs: SAMPLE_JOBS, sample: true };
}
