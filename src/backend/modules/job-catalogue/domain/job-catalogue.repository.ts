import type { JobField, JobTitleMatch } from "./job-catalogue";

/**
 * Read access to `job_fields` / `job_titles`. A port, so nothing outside
 * `infrastructure/` names the tables, and the use cases can be exercised
 * without Postgres.
 */
export interface JobCatalogueRepository {
    /** Every field in display order, each with its first `suggestionsPerField` titles. */
    listFields(suggestionsPerField: number): Promise<JobField[]>;

    /**
     * Titles containing every word, best first: exact match, then titles that
     * start with the query, then words that start with it, then curated
     * titles, then shorter ones. Optionally only within one field.
     */
    search(words: string[], options: { field?: string | null; limit: number }): Promise<JobTitleMatch[]>;

    /**
     * The catalogue's own spelling for each title that exists, keyed by the
     * lower-cased input. A title missing from the result is not in the catalogue.
     */
    resolve(titles: string[]): Promise<Map<string, string>>;
}
