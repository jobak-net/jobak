/**
 * The search rules: what makes a set of preferences valid in *shape*. Pure and
 * shared — the onboarding flow and the dashboard's Preferences page apply them
 * on every edit, and the backend applies them again to whatever it's sent, so
 * the browser can never show a draft the server would store differently.
 *
 * Completeness ("is a step answered?") is the onboarding steps' job
 * (`@/shared/onboarding`), not this file's.
 */

import type { JobPreferences, JobType, Seniority, WorkMode } from "@/shared/contracts/preferences";
import { countries } from "@/shared/countries";

export const WORK_MODES: readonly WorkMode[] = ["remote", "hybrid", "on-site"];
export const JOB_TYPES: readonly JobType[] = ["full-time", "part-time", "contract", "freelance"];
export const SENIORITIES: readonly Seniority[] = ["entry", "mid", "senior", "lead"];

/** The markets Jobak serves: the Arab League countries, as ISO alpha-2 codes. */
export const MENA_COUNTRY_CODES: ReadonlySet<string> = new Set(countries.map((c) => c.code));

/** Bounds on what a submission may contain — not UX limits, abuse limits. */
const MAX_TITLES = 10;
const MAX_KEYWORDS = 20;
const MAX_ITEM_LENGTH = 80;

/** Trimmed, de-duplicated (case-insensitively), capped. */
function cleanList(values: readonly string[], max: number): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = raw.trim().slice(0, MAX_ITEM_LENGTH);
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
    if (seen.size >= max) break;
  }
  return [...seen.values()];
}

function pick<T extends string>(values: readonly string[], allowed: readonly T[]): T[] {
  return allowed.filter((option) => values.includes(option));
}

/**
 * The search rules, applied to whatever was submitted.
 *
 *  - **Anywhere in the world means remote only.** Jobak targets MENA: a user
 *    not tied to a MENA country can only take work they can do from wherever
 *    they are. So `worldwide` forces `workModes` to `["remote"]` and clears the
 *    country list. The database enforces the same rule (migration 020).
 *  - Countries outside the MENA list are dropped, not stored.
 *  - Titles and keywords are trimmed, de-duplicated and capped.
 *  - Unknown work modes, job types and seniorities are dropped.
 *
 * Pure and total: any input yields valid preferences, so callers validate
 * *completeness* (is a step answered?) separately from *shape* (this).
 */
export function applySearchRules(input: JobPreferences): JobPreferences {
  const worldwide = input.location.worldwide;

  return {
    location: {
      worldwide,
      countries: worldwide
        ? []
        : [...new Set(input.location.countries.map((c) => c.toUpperCase()))].filter((c) =>
            MENA_COUNTRY_CODES.has(c),
          ),
    },
    workModes: worldwide ? ["remote"] : pick(input.workModes, WORK_MODES),
    jobTitles: cleanList(input.jobTitles, MAX_TITLES),
    keywords: cleanList(input.keywords, MAX_KEYWORDS),
    jobTypes: pick(input.jobTypes, JOB_TYPES),
    seniority: input.seniority && SENIORITIES.includes(input.seniority) ? input.seniority : null,
    field: input.field?.trim() || null,
  };
}

/** Empty preferences — what onboarding starts from. */
export const EMPTY_PREFERENCES: JobPreferences = {
  location: { worldwide: false, countries: [] },
  workModes: [],
  jobTitles: [],
  keywords: [],
  jobTypes: [],
  seniority: null,
  field: null,
};
