import { getJobSearchModule } from "@/backend/modules/job-search";
import { jobBookmarkSchema } from "@/backend/modules/job-search/validation/job-bookmark-schema";
import { jobIdParamsSchema } from "@/backend/modules/job-search/validation/job-id-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { JobBookmark } from "@/shared/contracts/jobs";

/**
 * PUT /api/v1/jobs/[jobId]/bookmark
 *
 * Saves whether the signed-in user has bookmarked a job. Contract:
 * `@/shared/contracts/jobs` (`jobBookmarkApiPath`, `JobBookmark`).
 */
export const dynamic = "force-dynamic";

export const PUT = withMiddlewares(
  { label: "jobs.bookmark", auth: "required", params: jobIdParamsSchema, body: jobBookmarkSchema },
  async ({ user, params, body }): Promise<JobBookmark> =>
    getJobSearchModule().setBookmark.execute(user.id, params.jobId, body.bookmarked),
);
