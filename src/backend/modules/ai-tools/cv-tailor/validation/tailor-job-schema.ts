import { z } from "zod";

import { CV_TAILOR_LIMITS as L, type TailorJob } from "@/shared/contracts/cv-tailor";

/** The job in both CV tailoring requests: the posting, with the company and title when the user gave them. */
export const tailorJobSchema = z.object({
  company: z.string().trim().max(L.company),
  title: z.string().trim().max(L.jobTitle),
  description: z.string().trim().min(L.descriptionMin).max(L.descriptionMax),
}) satisfies z.ZodType<TailorJob>;
