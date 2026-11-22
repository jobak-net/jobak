import { getJobBoardModule } from "@/backend/modules/job-board";
import { jobSlugParamsSchema } from "@/backend/modules/job-board/validation/job-slug-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { PublicJob } from "@/shared/contracts/job-board";

/**
 * GET /api/v1/job-board/[slug]
 *
 * One public job, 404 when there's none with that slug. Anyone may call it.
 * Contract: `@/shared/contracts/job-board`.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "job-board.get", auth: "none", rateLimit: "job-board", params: jobSlugParamsSchema },
  async ({ params }): Promise<PublicJob> => getJobBoardModule().get.execute(params.slug),
);
