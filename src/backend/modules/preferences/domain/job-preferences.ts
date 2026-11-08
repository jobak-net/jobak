import { countries } from "@/frontend/lib/configs/countries";

/**
 * What a user wants the job search to look for — the answers onboarding
 * collects and the dashboard's Preferences page edits.
 *
 * Only the fields that narrow a search live here. API keys, the public profile
 * and marketing answers have their own homes; mixing them in is how a
 * "preferences" object ends up carrying secrets to places that only needed a
 * country list.
 */

export type WorkMode = "remote" | "hybrid" | "on-site";
export type JobType = "full-time" | "part-time" | "contract" | "freelance";
export type Seniority = "entry" | "mid" | "senior" | "lead";

export const WORK_MODES: readonly WorkMode[] = ["remote", "hybrid", "on-site"];
export const JOB_TYPES: readonly JobType[] = ["full-time", "part-time", "contract", "freelance"];
export const SENIORITIES: readonly Seniority[] = ["entry", "mid", "senior", "lead"];

/** The markets Jobak serves: the Arab League countries, as ISO alpha-2 codes. */
export const MENA_COUNTRY_CODES: ReadonlySet<string> = new Set(countries.map((c) => c.code));

export interface LocationPreference {
    /**
     * "Anywhere in the world". Implies remote-only and no countries — see
     * `applySearchRules`. A flag of its own rather than an empty country list,
     * so "not answered yet" stays distinct from "anywhere is fine".
     */
    worldwide: boolean;
    /** MENA country codes. Empty when `worldwide`. */
    countries: string[];
}

export interface JobPreferences {
    location: LocationPreference;
    workModes: WorkMode[];
    /** Titles, from the job catalogue or typed by the user. */
    jobTitles: string[];
    /** Skills, tools or domains to look for in postings. */
    keywords: string[];
    jobTypes: JobType[];
    seniority: Seniority | null;
    /** The catalogue field the titles were picked from, if any. */
    field: string | null;
}

export interface StoredPreferences extends JobPreferences {
    onboardingCompleted: boolean;
}

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

const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * Untrusted input (a request body) → preferences of the right shape.
 *
 * Anything missing or of the wrong type becomes empty rather than an error;
 * `applySearchRules` then normalises values and the onboarding steps decide
 * whether what is left is complete. So a malformed request fails as
 * "incomplete", with a message, instead of as a crash.
 */
export function parsePreferences(raw: unknown): JobPreferences {
    const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const location = (typeof input.location === "object" && input.location !== null
        ? input.location
        : {}) as Record<string, unknown>;

    return applySearchRules({
        location: { worldwide: location.worldwide === true, countries: strings(location.countries) },
        workModes: strings(input.workModes) as WorkMode[],
        jobTitles: strings(input.jobTitles),
        keywords: strings(input.keywords),
        jobTypes: strings(input.jobTypes) as JobType[],
        seniority: typeof input.seniority === "string" ? (input.seniority as Seniority) : null,
        field: typeof input.field === "string" ? input.field : null,
    });
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
