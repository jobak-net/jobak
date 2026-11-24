import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { coverLetterSchema } from "@/backend/modules/ai-tools/cover-letter/validation/cover-letter-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { CoverLetterResponse } from "@/shared/contracts/cover-letter";

/**
 * /api/v1/ai-tools/cover-letter — writes a cover letter with the user's own
 * AI. Contract: `@/shared/contracts/cover-letter`. Guide: docs/ai-tools/COVER_LETTER.md.
 */
export const dynamic = "force-dynamic";
/** A slow model on a long posting can take a while; the AI client's own timeout is 90s. */
export const maxDuration = 120;

export const POST = withMiddlewares(
  { label: "ai-tools.cover-letter", auth: "required", rateLimit: "ai-tools.cover-letter", body: coverLetterSchema },
  async ({ user, body }): Promise<CoverLetterResponse> => getAiToolsModule().coverLetter.execute(user, body),
);
