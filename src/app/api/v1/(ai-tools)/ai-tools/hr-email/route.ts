import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { hrEmailSchema } from "@/backend/modules/ai-tools/hr-email/validation/hr-email-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { HrEmailResponse } from "@/shared/contracts/hr-email";

/**
 * /api/v1/ai-tools/hr-email — an email to HR, a recruiter or a hiring manager,
 * by the user's own AI. Contract: `@/shared/contracts/hr-email`. Guide: docs/ai-tools/HR_EMAIL.md.
 */
export const dynamic = "force-dynamic";
/** A reasoning model can take a while; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.hr-email", auth: "required", rateLimit: "ai-tools.hr-email", body: hrEmailSchema },
  async ({ user, body }): Promise<HrEmailResponse> => getAiToolsModule().hrEmail.execute(user, body),
);
