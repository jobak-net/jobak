/**
 * The job title catalogue: every title Jobak searches for, grouped into fields.
 *
 * Pure and browser-safe — the onboarding form imports these types and
 * `parseTitleQuery` directly. Persistence is behind `JobCatalogueRepository`.
 *
 * The catalogue is the only vocabulary onboarding accepts: a user's job titles
 * must be rows here, so the titles a user searches for, the titles the hourly
 * collector sweeps and the titles the matcher compares are one list.
 */

/** A field, with a handful of its most common titles to suggest. */
export interface JobField {
    /** Stable value persisted to `user_preferences.field`. */
    value: string;
    label: string;
    /** Suggestions only — the first few by catalogue order, not every title. */
    titles: string[];
}

/** One search hit. */
export interface JobTitleMatch {
    title: string;
    field: string;
}

/** Suggestions shown under a chosen field. Enough to scan, few enough to ship with the page. */
export const SUGGESTIONS_PER_FIELD = 12;

/** Most results one search returns. */
export const MAX_SEARCH_RESULTS = 8;

/** The shortest query worth sending: one letter matches a third of the catalogue. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Splits what was typed into words to match, each anywhere in a title — so
 * "senior nurse" finds "Senior Registered Nurse" — or returns null when
 * there is nothing worth searching for. Capped at five words: a longer query
 * is a sentence, not a title.
 */
export function parseTitleQuery(raw: string): string[] | null {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, 80);
    if (text.length < MIN_QUERY_LENGTH) return null;
    const words = text.split(" ").filter(Boolean).slice(0, 5);
    return words.length > 0 ? words : null;
}
