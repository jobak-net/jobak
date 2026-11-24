import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import {
  COVER_LETTER_LIMITS as L,
  COVER_LETTER_TONES,
  type CoverLetterRequest,
} from "@/shared/contracts/cover-letter";

/**
 * The body of `POST /api/v1/ai-tools/cover-letter`. Bounds come from the
 * shared contract, so the form refuses what the API would. Whether the user
 * has a key for `provider` is the integrations module's check (409).
 */
export const coverLetterSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  applicant: z.object({
    name: z.string().trim().min(1).max(L.name),
    experience: z.string().trim().max(L.experienceMax).optional(),
  }),
  job: z.object({
    company: z.string().trim().min(1).max(L.company),
    title: z.string().trim().min(1).max(L.jobTitle),
    description: z.string().trim().min(L.descriptionMin).max(L.descriptionMax),
  }),
  tone: z.enum(COVER_LETTER_TONES),
}) satisfies z.ZodType<CoverLetterRequest>;
