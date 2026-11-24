"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { useGenericMutation, useGenericQuery } from "@/frontend/shared/api";

import { actorById } from "../config/actors";
import { abortRun, actorPrice, datasetItems, getLimits, getRun, retryApify, startRun, type ActorPrice } from "../lib/apify-client";
import { collectionReducer, initialCollection, isCollecting } from "../lib/collection-state";
import { addHistory, readHistory, type HistoryEntry } from "../lib/history";
import { mergeJobs } from "../lib/results";
import { runCollection, type CollectionClient, type SitePlan } from "../lib/run-collection";
import type { ActorEntry, SearchInput } from "../types/catalogue";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function boundClient(token: string): CollectionClient {
    return {
        startRun: (actorId, input, options) => startRun(token, actorId, input, options),
        getRun: (runId, wait) => getRun(token, runId, wait),
        abortRun: (runId) => abortRun(token, runId),
        datasetItems: (datasetId, limit) => datasetItems(token, datasetId, limit),
    };
}

/** Live free-plan prices of `entries`, read from the public store (cached an hour). Null while unknown. */
export function useActorPrices(entries: readonly ActorEntry[]): Record<string, ActorPrice | null> {
    const results = useQueries({
        queries: entries.map((entry) => ({
            queryKey: ["apify", "price", entry.actorId],
            queryFn: () => actorPrice(entry.actorId),
            staleTime: 60 * 60_000,
            retry: retryApify,
        })),
    });
    return Object.fromEntries(entries.map((entry, i) => [entry.id, results[i]?.data ?? null]));
}

interface StartArgs {
    search: SearchInput;
    sites: SitePlan[];
    /** Set when reopening a saved search: its runs are polled, not started again. */
    entryId?: string;
}

/**
 * One search across sites, run from this browser on the user's Apify
 * account (`runCollection`), with its rows, merged jobs, Stop, and the
 * searches remembered on this device.
 */
export function useCollection(accountId: string, token: string) {
    const [state, dispatch] = useReducer(collectionReducer, initialCollection);
    const [search, setSearch] = useState<SearchInput | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory(accountId));
    /** The running search's signals: Stop, and leaving the page. */
    const controllers = useRef<{ stop: AbortController; leave: AbortController } | null>(null);
    const [stopping, setStopping] = useState(false);

    // Leaving the page (or the token being removed, which swaps in the lock) starts nothing new.
    // Runs already going finish on Apify and stay in history, so they can be reopened.
    useEffect(() => () => controllers.current?.leave.abort(), []);

    const limitsKey = ["apify", "limits", accountId];
    const limits = useGenericQuery(limitsKey, () => getLimits(token), { retry: retryApify, staleTime: 60_000 });

    const collection = useGenericMutation<StartArgs, void>({
        mutationFn: async ({ search: nextSearch, sites, entryId }) => {
            const signals = { stop: new AbortController(), leave: new AbortController() };
            controllers.current = signals;
            setStopping(false);
            setSearch(nextSearch);
            const id = entryId ?? crypto.randomUUID();
            const startedAt = new Date().toISOString();
            const runs = sites.filter((site) => site.runId).map((site) => ({ site: site.entry.id, runId: site.runId! }));

            await runCollection({
                client: boundClient(token),
                search: nextSearch,
                sites,
                maxConcurrent: limits.data?.concurrentRuns ?? 5,
                stop: signals.stop.signal,
                leave: signals.leave.signal,
                sleep,
                onEvent: (action) => {
                    dispatch(action);
                    // Each run is remembered the moment it starts, so a closed tab can come back to it.
                    if (action.type === "started") {
                        runs.push({ site: action.site, runId: action.run.id });
                        setHistory(addHistory(accountId, { id, search: nextSearch, runs: [...runs], startedAt }));
                    }
                },
            });
        },
        invalidateKeys: [limitsKey],
    });

    const { mutate } = collection;

    const start = useCallback((nextSearch: SearchInput, sites: SitePlan[]) => mutate({ search: nextSearch, sites }), [mutate]);

    /** Reopens a saved search: polls its runs (or reads their finished results), starts nothing. */
    const resume = useCallback(
        (entry: HistoryEntry) => {
            const sites = entry.runs.flatMap((run) => {
                const actor = actorById(run.site);
                return actor ? [{ entry: actor, estimateUsd: 0, runId: run.runId }] : [];
            });
            mutate({ search: entry.search, sites, entryId: entry.id });
        },
        [mutate],
    );

    const stop = useCallback(() => {
        controllers.current?.stop.abort();
        setStopping(true);
    }, []);

    const jobs = useMemo(() => mergeJobs(state.runs.map((run) => run.jobs)), [state.runs]);

    return {
        state,
        search,
        jobs,
        collecting: collection.isPending || isCollecting(state),
        stopping: collection.isPending && stopping,
        start,
        resume,
        stop,
        history,
        limits: limits.data ?? null,
    };
}
