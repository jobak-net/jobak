import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import { CV_REVIEW_LIMITS as L, type CvReviewRequest } from "@/shared/contracts/cv-review";

import { cvInputSchema } from "./cv-input-schema";

/**
 * The body of `POST /api/v1/ai-tools/cv-review`. Bounds come from the shared
 * contract, so the form refuses what the API would. Whether the user has a
 * key for `provider` is the integrations module's check (409).
 */
export const cvReviewSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  cv: cvInputSchema,
  targetRole: z.string().trim().max(L.targetRole),
}) satisfies z.ZodType<CvReviewRequest>;
