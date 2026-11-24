import type {
    JobPreferences,
    JobType,
    LocationPreference,
    Seniority,
    WorkMode,
} from "@/shared/contracts/preferences";
import { applySearchRules } from "@/shared/preferences/search-rules";

/*
 * The shapes are the API contract (`@/shared/contracts/preferences`) and the
 * search rules are shared with the frontend (`@/shared/preferences/search-rules`),
 * so both apply the same ones. Re-exported for the rest of the backend. What
 * is the server's alone lives here: reading untrusted input, and the stored row.
 */
export type { JobPreferences, JobType, LocationPreference, Seniority, WorkMode };
export {
    applySearchRules,
    EMPTY_PREFERENCES,
    JOB_TYPES,
    MENA_COUNTRY_CODES,
    SENIORITIES,
    WORK_MODES,
} from "@/shared/preferences/search-rules";

export interface StoredPreferences extends JobPreferences {
    onboardingCompleted: boolean;
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
