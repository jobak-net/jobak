import { getApplicantModule } from "@/backend/modules/applicant";
import { saveCvSchema } from "@/backend/modules/applicant/validation/save-cv-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { SavedCv } from "@/shared/contracts/applicant";

/**
 * POST /api/v1/applicant/cvs — keeps a CV the user just used (as text), or
 * moves the same one to the top. Contract: `@/shared/contracts/applicant`.
 */
export const dynamic = "force-dynamic";

export const POST = withMiddlewares(
  { label: "applicant.cvs.save", auth: "required", rateLimit: "applicant", body: saveCvSchema },
  async ({ user, body }): Promise<SavedCv> => getApplicantModule().saveCv.execute(user.id, body),
);
