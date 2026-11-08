import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getUserJobs } from "@/backend/actions/jobs";
import { SAMPLE_JOBS } from "@/frontend/lib/mocks/dashboard";
import type { Job } from "@/frontend/types/dashboard";

/**
 * The user's jobs, or sample jobs until they have some.
 *
 * `getUserJobs()` returns nothing until preferences exist (there is nothing to
 * narrow the pool by), which is every new account. Rather than open on an empty
 * dashboard, pages show sample jobs and say so via `sample`.
 *
 * A failure to read is logged and treated the same way: the dashboard should
 * still render if the jobs database is briefly unreachable.
 */
export async function loadJobs(): Promise<{ jobs: Job[]; sample: boolean }> {
  try {
    const jobs = await getUserJobs();
    if (jobs.length > 0) return { jobs, sample: false };
  } catch (error) {
    /*
     * Reading the request throws a control-flow signal during prerendering, not
     * a fault. Swallowing it would hide the bail-out from Next and could render
     * the page statically with sample data, so hand Next's own errors back.
     */
    unstable_rethrow(error);
    console.error("[dashboard] getUserJobs failed", error);
  }
  return { jobs: SAMPLE_JOBS, sample: true };
}
