import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import { CV_CATEGORIES, CV_REVIEW_LIMITS as L, type CvCategoryId, type CvImproveRequest } from "@/shared/contracts/cv-review";

import { cvInputSchema } from "./cv-input-schema";

/**
 * The body of `POST /api/v1/ai-tools/cv-review/improve`: the CV again, and
 * what the review asked to fix (`focus`), since the server keeps nothing
 * between the two requests.
 */
export const cvImproveSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  cv: cvInputSchema,
  targetRole: z.string().trim().max(L.targetRole),
  focus: z.array(z.string().trim().min(1).max(L.focusItemChars)).max(L.focusItems),
  originalScores: z.object(
    Object.fromEntries(CV_CATEGORIES.map((c) => [c.id, z.number().int().min(0).max(c.max)])) as Record<
      CvCategoryId,
      z.ZodNumber
    >,
  ),
}) satisfies z.ZodType<CvImproveRequest>;
