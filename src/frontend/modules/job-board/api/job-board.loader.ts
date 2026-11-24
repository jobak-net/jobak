import "server-only";

import { cache } from "react";

import { serverFetch } from "@/frontend/shared/api/server";
import {
  JOB_BOARD_API_PATH,
  jobBoardJobApiPath,
  type JobBoardPage,
  type JobBoardQuery,
  type PublicJob,
} from "@/shared/contracts/job-board";

/**
 * One page of the public board for `/jobs` (`GET /api/v1/job-board`).
 *
 * Empty when it couldn't be read, as before: the page then says nothing
 * matches rather than failing. (`serverFetch` logs the failure.)
 */
export async function loadJobBoard(query: JobBoardQuery): Promise<JobBoardPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();

  const result = await serverFetch<JobBoardPage>(search ? `${JOB_BOARD_API_PATH}?${search}` : JOB_BOARD_API_PATH);
  return result.kind === "ok" ? result.data : { jobs: [], total: 0 };
}

/**
 * One public job for `/jobs/[slug]` (`GET /api/v1/job-board/{slug}`), or null —
 * the page then answers 404, as before, for a failure as well as a missing job.
 *
 * `cache`d for the request: `generateMetadata` and the page both ask for it,
 * and should cost one API call, not two.
 */
export const loadJobBoardJob = cache(async (slug: string): Promise<PublicJob | null> => {
  const result = await serverFetch<PublicJob>(jobBoardJobApiPath(slug));
  return result.kind === "ok" ? result.data : null;
});
