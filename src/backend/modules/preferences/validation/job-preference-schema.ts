import { z } from "zod";

import type { JobPreferences } from "@/shared/contracts/preferences";

/**
 * The request schemas for the preferences routes (`PUT /api/v1/preferences`,
 * `POST /api/v1/onboarding`).
 *
 * Shape only — and tied to the shared contract (`satisfies`), so the schema
 * and `JobPreferences` can't drift apart. The *rules* (MENA countries only,
 * "anywhere" means remote, catalogue titles, de-duplicating and capping
 * lists) stay in the use case, which still runs on whatever passes here. The
 * limits below are generous ceilings against junk payloads, not product rules.
 */

const text = z.string().max(200);
const list = <T extends z.ZodType>(item: T) => z.array(item).max(100);

export const jobPreferenceSchema = z.object({
  location: z.object({
    worldwide: z.boolean(),
    countries: list(text),
  }),
  workModes: list(z.enum(["remote", "hybrid", "on-site"])),
  jobTitles: list(text),
  keywords: list(text),
  jobTypes: list(z.enum(["full-time", "part-time", "contract", "freelance"])),
  seniority: z.enum(["entry", "mid", "senior", "lead"]).nullable(),
  field: text.nullable(),
}) satisfies z.ZodType<JobPreferences>;
