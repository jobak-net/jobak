import { getApplicantModule } from "@/backend/modules/applicant";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { ApplicantResponse } from "@/shared/contracts/applicant";

/**
 * GET /api/v1/applicant — the name and saved CVs the AI tools start from.
 * Contract: `@/shared/contracts/applicant`.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "applicant.get", auth: "required" },
  async ({ user }): Promise<ApplicantResponse> => getApplicantModule().get.execute(user.id),
);
