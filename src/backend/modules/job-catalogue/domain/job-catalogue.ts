/**
 * The job title catalogue: every title Jobak searches for, grouped into fields.
 *
 * Pure. Persistence is behind `JobCatalogueRepository`.
 *
 * The catalogue is the only vocabulary onboarding accepts: a user's job titles
 * must be rows here, so the titles a user searches for, the titles the hourly
 * collector sweeps and the titles the matcher compares are one list.
 */

import {
    MAX_QUERY_LENGTH,
    MIN_QUERY_LENGTH,
    type JobField,
    type JobTitleMatch,
} from "@/shared/contracts/job-catalogue";

/** The shapes and query limits are the API contract (`@/shared/contracts/job-catalogue`). */
export { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH, type JobField, type JobTitleMatch };

/** Suggestions shown under a chosen field. Enough to scan, few enough to ship with the page. */
export const SUGGESTIONS_PER_FIELD = 12;

/** Most results one search returns. */
export const MAX_SEARCH_RESULTS = 8;

/**
 * Splits what was typed into words to match, each anywhere in a title — so
 * "senior nurse" finds "Senior Registered Nurse" — or returns null when
 * there is nothing worth searching for. Capped at five words: a longer query
 * is a sentence, not a title.
 */
export function parseTitleQuery(raw: string): string[] | null {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
    if (text.length < MIN_QUERY_LENGTH) return null;
    const words = text.split(" ").filter(Boolean).slice(0, 5);
    return words.length > 0 ? words : null;
}
