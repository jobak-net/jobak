"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck, Clock, Loader2, Square } from "lucide-react";

import { Button } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";
import { APIFY_SETTINGS_HREF } from "@/shared/routes";

import { actorById } from "../config/actors";
import type { SiteError, SiteRun } from "../lib/collection-state";

/** Why a site failed, in the page's words. */
function errorText(error: SiteError | undefined): string {
    switch (error) {
        case "unauthorized":
            return "Apify no longer accepts your token.";
        case "forbidden":
            return "Your token isn't allowed to run this actor or read its results.";
        case "payment":
            return "This actor needs credit or a rental on your Apify account.";
        case "invalid-input":
            return "Apify refused this search for this site.";
        case "not-found":
            return "Apify no longer has these results.";
        case "busy":
            return "Your Apify plan is running too many actors at once. Try again in a minute.";
        case "run-failed":
            return "The actor failed on this search.";
        default:
            return "Apify couldn't be reached. Try again.";
    }
}

function statusText(run: SiteRun): string {
    switch (run.phase) {
        case "queued":
            return "Waiting for a free slot";
        case "starting":
            return "Starting";
        case "running":
            return run.found > 0 ? `Running, ${run.found} found so far` : "Running";
        case "fetching":
            return "Reading the jobs";
        case "done":
            return run.jobs.length > 0 ? `${run.jobs.length} jobs` : "No jobs came back for this search";
        case "stopped":
            return run.jobs.length > 0 ? `Stopped, ${run.jobs.length} jobs kept` : "Stopped";
        case "failed":
            return errorText(run.error);
    }
}

function Icon({ run }: { run: SiteRun }) {
    if (run.phase === "done") return <CircleCheck className="size-4 text-accent" />;
    if (run.phase === "failed") return <CircleAlert className="size-4 text-status-amber" />;
    if (run.phase === "queued" || run.phase === "stopped") return <Clock className="size-4 text-fg-quaternary" />;
    return <Loader2 className="size-4 animate-spin text-fg-tertiary" />;
}

/** One row per site while a search runs, then what each one brought back; Stop while anything is going. */
export function RunProgress({
    runs,
    collecting,
    stopping,
    onStop,
}: {
    runs: SiteRun[];
    collecting: boolean;
    stopping: boolean;
    onStop: () => void;
}) {
    if (runs.length === 0) return null;
    const dropped = runs.reduce((sum, run) => sum + run.dropped, 0);
    const cost = runs.reduce((sum, run) => sum + (run.costUsd ?? 0), 0);

    return (
        <section aria-live="polite" className="rounded-card border border-border-subtle bg-white/2 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-fg-primary">{collecting ? "Searching" : "Search finished"}</h2>
                {collecting && (
                    <Button variant="secondary" size="sm" onClick={onStop} disabled={stopping}>
                        {stopping ? <Loader2 className="animate-spin" /> : <Square />}
                        {stopping ? "Stopping" : "Stop"}
                    </Button>
                )}
            </div>
            <ul className="divide-y divide-border-subtle">
                {runs.map((run) => {
                    const entry = actorById(run.site);
                    return (
                        <li key={run.site} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
                            <Icon run={run} />
                            <span className="w-40 shrink-0 font-medium text-fg-primary">{entry?.site ?? run.site}</span>
                            <span className={cn("min-w-0 flex-1", run.phase === "failed" ? "text-status-amber" : "text-fg-tertiary")}>
                                {statusText(run)}{" "}
                                {run.phase === "failed" && (run.error === "unauthorized" || run.error === "forbidden") && (
                                    <Link href={APIFY_SETTINGS_HREF} className="text-accent-text underline-offset-2 hover:underline">
                                        Update it in Settings
                                    </Link>
                                )}
                                {run.phase === "failed" && run.error === "payment" && entry && (
                                    <a
                                        href={entry.storeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent-text underline-offset-2 hover:underline"
                                    >
                                        Open the actor
                                    </a>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {(dropped > 0 || cost > 0) && !collecting && (
                <p className="mt-3 text-[12px] text-fg-quaternary">
                    {cost > 0 && `Apify reports about $${cost.toFixed(3)} spent so far; final charges can settle a little later. `}
                    {dropped > 0 && `${dropped} ${dropped === 1 ? "result was" : "results were"} skipped for having no title or link.`}
                </p>
            )}
        </section>
    );
}
