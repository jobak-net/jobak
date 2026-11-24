import type { ActorEntry, CollectedJob, SearchInput } from "../types/catalogue";
import { ApifyError, FINISHED_STATUSES, type ApifyRun } from "./apify-client";
import type { CollectionAction } from "./collection-state";
import { safeUrl } from "./read-fields";
import { runCap } from "./results";

/** The Apify calls a collection makes, with the user's token already bound. */
export interface CollectionClient {
    startRun(actorId: string, input: object, options: { maxItems: number; maxTotalChargeUsd: number }): Promise<ApifyRun>;
    getRun(runId: string, waitForFinishSecs?: number): Promise<ApifyRun>;
    abortRun(runId: string): Promise<ApifyRun>;
    datasetItems(datasetId: string, limit: number): Promise<unknown[]>;
}

export interface SitePlan {
    entry: ActorEntry;
    /** What the user was shown for this site; the run is capped at it plus 10%. */
    estimateUsd: number;
    /** Set when resuming: the run already exists, so it's polled, never started. */
    runId?: string;
}

const BUSY_WAIT_MS = 5_000;
/** About two and a half minutes of waiting for a free slot before giving up on a site. */
const BUSY_TRIES = 30;
const TRANSIENT_TRIES = 3;
const TRANSIENT = ["network", "unavailable", "rate-limited"];

/**
 * Runs one search on every planned site, from the browser:
 * - at most `maxConcurrent` runs at once (the plan's limit), the rest wait;
 * - a "busy" answer waits and tries again;
 * - each run is long-polled until it finishes, then its jobs are read;
 * - when `stop` fires (the Stop button), nothing new starts and every
 *   running run is aborted at once, not after the current long poll; a
 *   failed abort is tried again. What the runs collected is kept;
 * - when `leave` fires (the page is gone), nothing new starts and following
 *   ends. Runs already going finish on Apify; history can reopen them.
 *
 * One site failing never stops the others. Everything that happens is
 * reported through `onEvent`, for `collectionReducer`.
 */
export async function runCollection({
    client,
    search,
    sites,
    maxConcurrent,
    stop,
    leave,
    sleep,
    onEvent,
}: {
    client: CollectionClient;
    search: SearchInput;
    sites: SitePlan[];
    maxConcurrent: number;
    stop: AbortSignal;
    leave?: AbortSignal;
    sleep: (ms: number) => Promise<void>;
    onEvent: (action: CollectionAction) => void;
}): Promise<void> {
    const left = () => leave?.aborted === true;

    /** Runs being followed, and whether Apify has confirmed their abort. */
    const following = new Map<string, { abortConfirmed: boolean; aborting: Promise<void> | null }>();

    /** Aborts one run, trying again after a transient failure; confirmed only when Apify accepts it. */
    function abort(runId: string): Promise<void> {
        const state = following.get(runId);
        if (!state || state.abortConfirmed) return Promise.resolve();
        state.aborting ??= (async () => {
            for (let attempt = 0; attempt < TRANSIENT_TRIES && !state.abortConfirmed; attempt++) {
                try {
                    await client.abortRun(runId);
                    state.abortConfirmed = true;
                } catch {
                    await sleep(1_000);
                }
            }
            state.aborting = null;
        })();
        return state.aborting;
    }

    // Stop aborts every run being followed right away, while their long polls are still open.
    const abortAll = () => void Promise.all([...following.keys()].map(abort));
    if (stop.aborted) abortAll();
    else stop.addEventListener("abort", abortAll, { once: true });

    const runIds = Object.fromEntries(sites.filter((site) => site.runId).map((site) => [site.entry.id, site.runId!]));
    onEvent({ type: "begin", sites: sites.map((site) => site.entry.id), runIds });

    const queue = sites.map((plan) => ({ plan, busyTries: 0 }));

    async function worker() {
        for (let item = queue.shift(); item; item = queue.shift()) {
            const { entry } = item.plan;
            let runId = item.plan.runId;

            if (!runId) {
                if (stop.aborted || left()) {
                    onEvent({ type: "stopped", site: entry.id });
                    continue;
                }
                onEvent({ type: "starting", site: entry.id });
                try {
                    const run = await client.startRun(entry.actorId, entry.buildInput(search), {
                        maxItems: search.jobsPerSite,
                        maxTotalChargeUsd: runCap(item.plan.estimateUsd),
                    });
                    runId = run.id;
                    onEvent({ type: "started", site: entry.id, run });
                } catch (error) {
                    if (error instanceof ApifyError && error.kind === "busy" && item.busyTries < BUSY_TRIES) {
                        item.busyTries++;
                        onEvent({ type: "waiting", site: entry.id });
                        await sleep(BUSY_WAIT_MS);
                        queue.push(item);
                        continue;
                    }
                    onEvent({ type: "failed", site: entry.id, kind: error instanceof ApifyError ? error.kind : "unavailable" });
                    continue;
                }
            }

            await follow(entry, runId);
        }
    }

    /** Polls one run to its end, then reads its jobs. */
    async function follow(entry: ActorEntry, runId: string) {
        let run: ApifyRun | null = null;
        let transientTries = 0;
        const state = { abortConfirmed: false, aborting: null as Promise<void> | null };
        following.set(runId, state);

        while (!run || !FINISHED_STATUSES.includes(run.status)) {
            if (left() && !stop.aborted) return; // the page is gone: the run finishes on Apify
            // An abort that hasn't been confirmed yet (it failed, or Stop came first) is tried again here.
            if (stop.aborted && !state.abortConfirmed) await abort(runId);
            try {
                run = await client.getRun(runId, 30);
                transientTries = 0;
                onEvent({ type: "polled", site: entry.id, run });
            } catch (error) {
                const kind = error instanceof ApifyError ? error.kind : "unavailable";
                if (TRANSIENT.includes(kind) && transientTries++ < TRANSIENT_TRIES) {
                    await sleep(2_000);
                    continue;
                }
                onEvent({ type: "failed", site: entry.id, kind });
                return;
            }
        }

        following.delete(runId);
        const stopped = run.status === "ABORTED" || stop.aborted;

        // Always read the dataset: Apify doesn't report every actor's item count on the run.
        onEvent({ type: "fetching", site: entry.id });
        try {
            const items = await client.datasetItems(run.defaultDatasetId, search.jobsPerSite);
            if (items.length === 0 && !stopped && run.status !== "SUCCEEDED") {
                onEvent({ type: "failed", site: entry.id, kind: "run-failed" });
                return;
            }
            const jobs: CollectedJob[] = [];
            for (const item of items) {
                // readJob already refuses non-http(s) links; checked again here so no entry can slip one through.
                const job = entry.readJob(item);
                const url = job ? safeUrl(job.url) : null;
                if (job && url) jobs.push({ ...job, url, site: entry.id });
            }
            onEvent({ type: "fetched", site: entry.id, jobs, dropped: items.length - jobs.length, stopped });
        } catch (error) {
            onEvent({ type: "failed", site: entry.id, kind: error instanceof ApifyError ? error.kind : "unavailable" });
        }
    }

    await Promise.all(Array.from({ length: Math.max(1, Math.min(maxConcurrent, queue.length)) }, worker));
}
