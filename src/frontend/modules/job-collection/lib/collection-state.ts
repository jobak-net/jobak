import type { CollectedJob } from "../types/catalogue";
import type { ApifyErrorKind, ApifyRun } from "./apify-client";

/**
 * One search across sites, as the page shows it: one row per site, from
 * waiting through running to its jobs (or why it failed). A plain reducer:
 * `runCollection` reports what happens, this decides what the page shows.
 */

export type SitePhase = "queued" | "starting" | "running" | "fetching" | "done" | "failed" | "stopped";

/** Why a site failed: an Apify error kind, or the actor's own run failing. */
export type SiteError = ApifyErrorKind | "run-failed";

export interface SiteRun {
    /** Catalogue entry id. */
    site: string;
    phase: SitePhase;
    runId?: string;
    datasetId?: string;
    /** Items the run has collected so far, from Apify. */
    found: number;
    /** Items `readJob` rejected (no title, no http(s) link). */
    dropped: number;
    jobs: CollectedJob[];
    error?: SiteError;
    /** What the run has cost so far, when Apify reports it. */
    costUsd: number | null;
}

export interface CollectionState {
    runs: SiteRun[];
}

export type CollectionAction =
    | { type: "begin"; sites: string[]; runIds?: Record<string, string> }
    | { type: "starting"; site: string }
    | { type: "waiting"; site: string }
    | { type: "started"; site: string; run: ApifyRun }
    | { type: "polled"; site: string; run: ApifyRun }
    | { type: "fetching"; site: string }
    | { type: "fetched"; site: string; jobs: CollectedJob[]; dropped: number; stopped: boolean }
    | { type: "failed"; site: string; kind: SiteError }
    | { type: "stopped"; site: string };

export const initialCollection: CollectionState = { runs: [] };

const ACTIVE: readonly SitePhase[] = ["queued", "starting", "running", "fetching"];

export function isCollecting(state: CollectionState): boolean {
    return state.runs.some((run) => ACTIVE.includes(run.phase));
}

function update(state: CollectionState, site: string, change: (run: SiteRun) => SiteRun): CollectionState {
    return { runs: state.runs.map((run) => (run.site === site ? change(run) : run)) };
}

export function collectionReducer(state: CollectionState, action: CollectionAction): CollectionState {
    switch (action.type) {
        case "begin":
            return {
                runs: action.sites.map((site) => {
                    const runId = action.runIds?.[site];
                    return { site, phase: runId ? "running" : "queued", runId, found: 0, dropped: 0, jobs: [], costUsd: null };
                }),
            };
        case "starting":
            return update(state, action.site, (run) => ({ ...run, phase: "starting" }));
        case "waiting":
            return update(state, action.site, (run) => ({ ...run, phase: "queued" }));
        case "started":
        case "polled":
            return update(state, action.site, (run) => ({
                ...run,
                phase: "running",
                runId: action.run.id,
                datasetId: action.run.defaultDatasetId,
                found: action.run.itemCount,
                costUsd: action.run.usageTotalUsd,
            }));
        case "fetching":
            return update(state, action.site, (run) => ({ ...run, phase: "fetching" }));
        case "fetched":
            return update(state, action.site, (run) => ({
                ...run,
                phase: action.stopped ? "stopped" : "done",
                jobs: action.jobs,
                dropped: action.dropped,
            }));
        case "failed":
            return update(state, action.site, (run) => ({ ...run, phase: "failed", error: action.kind }));
        case "stopped":
            return update(state, action.site, (run) => ({ ...run, phase: "stopped" }));
    }
}
