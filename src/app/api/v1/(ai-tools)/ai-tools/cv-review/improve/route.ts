import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { cvImproveSchema } from "@/backend/modules/ai-tools/cv-review/validation/cv-improve-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { CvImproveResponse } from "@/shared/contracts/cv-review";

/**
 * /api/v1/ai-tools/cv-review/improve — the improved CV, after the review.
 * Contract: `@/shared/contracts/cv-review`. Guide: docs/ai-tools/CV_REVIEW.md.
 * Shares the review's rate limit: one budget for the tool.
 */
export const dynamic = "force-dynamic";
/** Writing a whole CV is the longest AI call the tools make; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.cv-review.improve", auth: "required", rateLimit: "ai-tools.cv-review", body: cvImproveSchema },
  async ({ user, body }): Promise<CvImproveResponse> => getAiToolsModule().cvReview.improve.execute(user, body),
);
