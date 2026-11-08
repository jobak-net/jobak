import type { JobPreferences, WorkMode } from "@/backend/modules/preferences/domain/job-preferences";

/**
 * The setup that runs between the job questions and connecting the AI.
 *
 * Each step is real work against the database — basic filters over the jobs
 * and sources Jobak has collected — not a timed animation. Pure and
 * browser-safe: the setup screen imports these types to draw the results.
 */
export type SetupStepId = "preferences" | "search" | "sources";

export const SETUP_STEPS: readonly SetupStepId[] = ["preferences", "search", "sources"];

export function isSetupStepId(value: unknown): value is SetupStepId {
    return typeof value === "string" && (SETUP_STEPS as readonly string[]).includes(value);
}

/** Step 1: the answers, read back from where they were saved. */
export interface PreferencesStepData {
    titles: number;
    countries: string[];
    worldwide: boolean;
    workModes: WorkMode[];
}

/**
 * Step 2: the search as a funnel. Each count narrows the one before it —
 * every active job, then those matching a title, then in the user's
 * locations, then in a work mode they accept.
 */
export interface SearchStepData {
    total: number;
    matchingTitles: number;
    inLocations: number;
    matching: number;
}

/** Step 3: where the jobs come from. */
export interface SourcesStepData {
    /** Sources Jobak collects from (`sources.is_active`). */
    active: number;
    /** Sources with at least one job in the user's search, most jobs first. */
    withJobs: { name: string; jobs: number }[];
    /** When the newest matching job was collected (ISO), or null when there are none. */
    newestAt: string | null;
}

export type SetupStepResult =
    | { ok: true; step: "preferences"; data: PreferencesStepData }
    | { ok: true; step: "search"; data: SearchStepData }
    | { ok: true; step: "sources"; data: SourcesStepData }
    | { ok: false; step: SetupStepId; message: string };

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
