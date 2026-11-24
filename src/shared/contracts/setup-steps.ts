/**
 * The contract of `GET /api/v1/onboarding/setup-steps/[step]`: one step of the
 * setup shown between the job questions and connecting the AI. Imports only
 * other contracts (see `src/shared/README.md`).
 *
 *   200  SetupStepResult   the step's numbers, or `ok: false` with a message
 *                          (a step that can't run is skipped, not an error)
 *   401  { error }         nobody is signed in
 *   404  { error }         not a setup step
 *   503  { error }         couldn't run it
 */

import type { WorkMode } from "./preferences";

export const SETUP_STEPS_API_PATH = "/api/v1/onboarding/setup-steps";

/**
 * The setup that runs between the job questions and connecting the AI.
 *
 * Each step is real work against the database — basic filters over the jobs
 * and sources Jobak has collected — not a timed animation.
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
