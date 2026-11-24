import { z } from "zod";

import { APPLICANT_LIMITS as L, type SaveCvRequest } from "@/shared/contracts/applicant";
import { CV_REVIEW_LIMITS, CV_SOURCES } from "@/shared/contracts/cv-review";

/**
 * The body of `POST /api/v1/applicant/cvs`: a label and the CV as text, with
 * the same bounds the AI tools accept (`CV_REVIEW_LIMITS`), so anything a
 * tool takes can be saved.
 */
export const saveCvSchema = z.object({
  label: z.string().trim().min(1).max(L.label),
  cv: z.object({
    text: z.string().trim().min(L.cvMin).max(L.cvMax),
    source: z.enum(CV_SOURCES),
    pages: z.number().int().min(1).max(CV_REVIEW_LIMITS.maxPages).optional(),
  }),
}) satisfies z.ZodType<SaveCvRequest>;
