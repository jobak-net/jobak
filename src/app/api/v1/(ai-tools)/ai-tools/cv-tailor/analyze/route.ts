import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { cvFitSchema } from "@/backend/modules/ai-tools/cv-tailor/validation/cv-fit-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { CvFitResponse } from "@/shared/contracts/cv-tailor";

/**
 * /api/v1/ai-tools/cv-tailor/analyze — how the user's CV fits one job, by
 * their own AI. Contract: `@/shared/contracts/cv-tailor`. Guide: docs/ai-tools/CV_TAILOR.md.
 */
export const dynamic = "force-dynamic";
/** A reasoning model on a CV and a posting can take a while; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.cv-tailor.analyze", auth: "required", rateLimit: "ai-tools.cv-tailor", body: cvFitSchema },
  async ({ user, body }): Promise<CvFitResponse> => getAiToolsModule().cvTailor.analyze.execute(user, body),
);
