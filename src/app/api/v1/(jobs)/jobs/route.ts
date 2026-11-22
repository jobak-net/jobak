import { getJobSearchModule } from "@/backend/modules/job-search";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { Job } from "@/shared/contracts/jobs";

/**
 * GET /api/v1/jobs
 *
 * The jobs worth showing the signed-in user, best matches first. Contract:
 * `@/shared/contracts/jobs` — 200 with `Job[]` (empty until they have
 * preferences), 401 signed out, 503 couldn't read them.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "jobs.list", auth: "required" },
  async ({ user }): Promise<Job[]> => getJobSearchModule().listUserJobs.execute(user.id),
);
