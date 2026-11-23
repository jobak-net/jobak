import { z } from "zod";

import { CV_REVIEW_LIMITS as L, CV_SOURCES, type CvInput } from "@/shared/contracts/cv-review";

/**
 * The CV in both CV review requests: its text (a file was read in the
 * browser; the server never receives one), where it came from, and a PDF's
 * page count, which can't be over the limit the page enforces.
 */
export const cvInputSchema = z.object({
  text: z.string().trim().min(L.cvMin).max(L.cvMax),
  source: z.enum(CV_SOURCES),
  pages: z.number().int().min(1).max(L.maxPages).optional(),
}) satisfies z.ZodType<CvInput>;
