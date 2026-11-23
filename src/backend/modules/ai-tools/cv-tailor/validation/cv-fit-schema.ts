import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import type { CvFitRequest } from "@/shared/contracts/cv-tailor";

import { cvInputSchema } from "../../cv-review/validation/cv-input-schema";
import { tailorJobSchema } from "./tailor-job-schema";

/** The body of `POST /api/v1/ai-tools/cv-tailor/analyze`. The CV's bounds are CV review's (`cvInputSchema`). */
export const cvFitSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  cv: cvInputSchema,
  job: tailorJobSchema,
}) satisfies z.ZodType<CvFitRequest>;
