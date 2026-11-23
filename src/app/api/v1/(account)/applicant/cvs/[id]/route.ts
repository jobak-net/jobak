import { getApplicantModule } from "@/backend/modules/applicant";
import { cvIdParamsSchema } from "@/backend/modules/applicant/validation/cv-id-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";

/**
 * DELETE /api/v1/applicant/cvs/[id] — deletes one of the user's saved CVs.
 * Contract: `@/shared/contracts/applicant`.
 */
export const dynamic = "force-dynamic";

export const DELETE = withMiddlewares(
  { label: "applicant.cvs.delete", auth: "required", rateLimit: "applicant", params: cvIdParamsSchema },
  async ({ user, params }): Promise<{ deleted: true }> => getApplicantModule().deleteCv.execute(user.id, params.id),
);
