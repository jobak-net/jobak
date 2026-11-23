import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import { CV_TAILOR_LIMITS as L, FIT_CATEGORIES, type CvTailorRequest, type FitCategoryId } from "@/shared/contracts/cv-tailor";

import { cvInputSchema } from "../../cv-review/validation/cv-input-schema";
import { tailorJobSchema } from "./tailor-job-schema";

/**
 * The body of `POST /api/v1/ai-tools/cv-tailor`: the CV and job again, and
 * what the analysis found (`focus`, `originalScores`), since the server keeps
 * nothing between the two requests.
 */
export const cvTailorSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  cv: cvInputSchema,
  job: tailorJobSchema,
  focus: z.array(z.string().trim().min(1).max(L.focusItemChars)).max(L.focusItems),
  originalScores: z.object(
    Object.fromEntries(FIT_CATEGORIES.map((c) => [c.id, z.number().int().min(0).max(c.max)])) as Record<
      FitCategoryId,
      z.ZodNumber
    >,
  ),
}) satisfies z.ZodType<CvTailorRequest>;
