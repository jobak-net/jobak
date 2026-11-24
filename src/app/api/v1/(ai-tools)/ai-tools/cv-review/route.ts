import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { cvReviewSchema } from "@/backend/modules/ai-tools/cv-review/validation/cv-review-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { CvReviewResponse } from "@/shared/contracts/cv-review";

/**
 * /api/v1/ai-tools/cv-review — a scored review of the user's CV by their own
 * AI. Contract: `@/shared/contracts/cv-review`. Guide: docs/ai-tools/CV_REVIEW.md.
 */
export const dynamic = "force-dynamic";
/** A reasoning model on a two-page CV can take a while; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.cv-review", auth: "required", rateLimit: "ai-tools.cv-review", body: cvReviewSchema },
  async ({ user, body }): Promise<CvReviewResponse> => getAiToolsModule().cvReview.review.execute(user, body),
);
