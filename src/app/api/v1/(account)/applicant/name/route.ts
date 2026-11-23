import { getApplicantModule } from "@/backend/modules/applicant";
import { applicantNameSchema } from "@/backend/modules/applicant/validation/applicant-name-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";

/**
 * PUT /api/v1/applicant/name — the name the user writes on applications.
 * Contract: `@/shared/contracts/applicant`.
 */
export const dynamic = "force-dynamic";

export const PUT = withMiddlewares(
  { label: "applicant.name", auth: "required", rateLimit: "applicant", body: applicantNameSchema },
  async ({ user, body }): Promise<{ name: string }> => getApplicantModule().setName.execute(user.id, body.name),
);
