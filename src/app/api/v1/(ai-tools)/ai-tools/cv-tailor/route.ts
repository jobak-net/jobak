import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { cvTailorSchema } from "@/backend/modules/ai-tools/cv-tailor/validation/cv-tailor-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { CvTailorResponse } from "@/shared/contracts/cv-tailor";

/**
 * /api/v1/ai-tools/cv-tailor — the CV tailored to one job, after the
 * analysis. Contract: `@/shared/contracts/cv-tailor`. Guide: docs/ai-tools/CV_TAILOR.md.
 * Shares the analysis's rate limit: one budget for the tool.
 */
export const dynamic = "force-dynamic";
/** Writing a whole CV is the longest AI call the tools make; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.cv-tailor", auth: "required", rateLimit: "ai-tools.cv-tailor", body: cvTailorSchema },
  async ({ user, body }): Promise<CvTailorResponse> => getAiToolsModule().cvTailor.tailor.execute(user, body),
);
