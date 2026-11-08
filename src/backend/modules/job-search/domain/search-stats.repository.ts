import type { SearchCriteria, SearchStepData, SourcesStepData } from "./setup-steps";

/**
 * Counts over the collected jobs and sources. A port, so nothing outside
 * `infrastructure/` names the tables, and the setup steps can be exercised
 * without Postgres.
 */
export interface SearchStatsRepository {
    /** The funnel: all active jobs, then each filter applied on top of the last. */
    funnel(criteria: SearchCriteria): Promise<SearchStepData>;

    /** Active sources, and which of them have jobs matching every filter. */
    sources(criteria: SearchCriteria): Promise<SourcesStepData>;
}
