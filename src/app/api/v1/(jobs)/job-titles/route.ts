import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";
import { jobTitleSearchSchema } from "@/backend/modules/job-catalogue/validation/job-title-search-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { JobTitleMatch } from "@/shared/contracts/job-catalogue";

/**
 * GET /api/v1/job-titles?q=<text>&field=<value>
 *
 * Type-ahead search over the job title catalogue, for the onboarding Roles
 * step and the Preferences page. Contract: `@/shared/contracts/job-catalogue`.
 *
 * Signed-in only: the catalogue isn't secret, but an open search endpoint is
 * an invitation to page through the whole table one request at a time.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "job-titles.search", auth: "required", rateLimit: "job-titles", query: jobTitleSearchSchema },
  async ({ query }): Promise<JobTitleMatch[]> =>
    getJobCatalogueModule().search.execute(query.q, query.field ?? null),
);
