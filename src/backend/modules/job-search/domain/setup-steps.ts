import type { JobPreferences } from "@/backend/modules/preferences/domain/job-preferences";

/*
 * The step ids and result shapes are the API contract
 * (`@/shared/contracts/setup-steps`), shared with the frontend. Re-exported
 * for the rest of the backend; the query criteria below are the server's own.
 */
export {
    isSetupStepId,
    SETUP_STEPS,
    type PreferencesStepData,
    type SearchStepData,
    type SetupStepId,
    type SetupStepResult,
    type SourcesStepData,
} from "@/shared/contracts/setup-steps";

/**
 * The filters, in the shape the jobs table speaks. Mirrors
 * `match_candidate_jobs` (012) so these counts agree with what the AI will
 * later be asked to score — a funnel promising 30 jobs the scorer then never
 * sees would read as "the AI is broken".
 */
export interface SearchCriteria {
    titles: string[];
    countries: string[];
    worldwide: boolean;
    /** `jobs.job_type` values: 'remote' | 'onsite' | 'hybrid'. */
    jobTypes: string[];
}

export function criteriaFrom(p: JobPreferences): SearchCriteria {
    return {
        titles: p.jobTitles,
        countries: p.location.countries,
        worldwide: p.location.worldwide,
        // Preferences say "on-site"; the jobs table says "onsite".
        jobTypes: p.workModes.map((mode) => (mode === "on-site" ? "onsite" : mode)),
    };
}
