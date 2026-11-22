import { getJobBoardModule } from "@/backend/modules/job-board";
import { jobBoardQuerySchema } from "@/backend/modules/job-board/validation/job-board-query-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { JobBoardPage } from "@/shared/contracts/job-board";

/**
 * GET /api/v1/job-board?region&workplace&q&category&page&limit
 *
 * The public job board: one page of listings and the total. Anyone may call
 * it. Contract: `@/shared/contracts/job-board`.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "job-board.list", auth: "none", rateLimit: "job-board", query: jobBoardQuerySchema },
  async ({ query }): Promise<JobBoardPage> => getJobBoardModule().list.execute(query),
);
