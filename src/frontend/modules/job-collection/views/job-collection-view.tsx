"use client";

import { useRef } from "react";
import { Loader2, Play, RotateCcw } from "lucide-react";

import { Button, PageHeader } from "@/frontend/shared/ui";

import { ApifyGate } from "../components/apify-gate";
import { HistoryList } from "../components/history-list";
import { ResultsTable } from "../components/results-table";
import { RunProgress } from "../components/run-progress";
import { SearchForm } from "../components/search-form";
import { SitePicker } from "../components/site-picker";
import { ACTORS } from "../config/actors";
import { useActorPrices, useCollection } from "../hooks/use-collection";
import { useScrollToResults } from "../hooks/use-scroll-to-results";
import { useSearchForm } from "../hooks/use-search-form";
import { planSites, totalEstimate } from "../lib/plans";

function Collector({ accountId, token, initialCountry }: { accountId: string; token: string; initialCountry: string }) {
    const form = useSearchForm(accountId, initialCountry);
    const collection = useCollection(accountId, token);
    const live = useActorPrices(ACTORS);
    const results = useRef<HTMLDivElement>(null);
    useScrollToResults(results, collection.collecting, collection.jobs.length);

    /** Live free-plan prices where the store answered; planSites falls back to each entry's stored price. */
    const livePrices = Object.fromEntries(
        ACTORS.flatMap((entry) => {
            const price = live[entry.id];
            return price && price.perJobUsd !== null ? [[entry.id, { perJobUsd: price.perJobUsd, startUsd: price.startUsd }]] : [];
        }),
    );
    const prices = Object.fromEntries(ACTORS.map((entry) => [entry.id, livePrices[entry.id] ?? entry.fallbackPrice]));

    const plans = planSites(form.runnable, form.search, livePrices);
    const estimate = totalEstimate(plans);
    const creditLeft = collection.limits ? Math.max(0, collection.limits.limitUsd - collection.limits.usedUsd) : null;

    function run() {
        form.rememberSites();
        collection.start(form.search, plans);
    }

    // Runs whose results Apify no longer keeps: offered again, priced and coverage-checked like any search.
    const goneSites = collection.state.runs.filter((r) => r.phase === "failed" && r.error === "not-found").map((r) => r.site);
    const againPlans = collection.search ? planSites(goneSites, collection.search, livePrices) : [];
    function runAgain() {
        if (collection.search && againPlans.length > 0) collection.start(collection.search, againPlans);
    }

    return (
        <div className="space-y-8">
            {creditLeft !== null && (
                <p className="-mt-4 text-[13px] text-fg-tertiary">
                    Apify credit left this month: <span className="font-medium text-fg-secondary">${creditLeft.toFixed(2)}</span>
                </p>
            )}

            <HistoryList entries={collection.history} onOpen={collection.resume} disabled={collection.collecting} />

            <div className="space-y-8 rounded-[24px] border border-border-subtle p-5 sm:p-7">
                <SearchForm
                    title={form.title}
                    onTitleChange={form.setTitle}
                    country={form.country}
                    onCountryChange={form.setCountry}
                    city={form.city}
                    onCityChange={form.setCity}
                    jobsPerSite={form.jobsPerSite}
                    onJobsPerSiteChange={form.setJobsPerSite}
                    disabled={collection.collecting}
                />
                <SitePicker
                    country={form.country}
                    filter={form.filter}
                    onFilterChange={form.setFilter}
                    picked={form.picked}
                    onToggle={form.toggle}
                    prices={prices}
                    disabled={collection.collecting}
                />
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-subtle pt-5">
                    <p className="min-w-0 flex-1 text-[13px] text-fg-tertiary">
                        {form.runnable.length === 0
                            ? form.country
                                ? "Pick at least one site that covers this country."
                                : "Pick a country to see which sites cover it."
                            : `${form.runnable.length} ${form.runnable.length === 1 ? "site" : "sites"}, up to ${form.jobsPerSite} jobs each. Each run is capped at its estimate plus 10%.`}
                    </p>
                    <Button variant="primary" onClick={run} disabled={!form.canRun || collection.collecting}>
                        {collection.collecting ? <Loader2 className="animate-spin" /> : <Play />}
                        {form.runnable.length > 0 ? `Run search, up to about $${estimate.toFixed(2)}` : "Run search"}
                    </Button>
                </div>
            </div>

            <RunProgress runs={collection.state.runs} collecting={collection.collecting} stopping={collection.stopping} onStop={collection.stop} />

            {!collection.collecting && againPlans.length > 0 && (
                <Button variant="secondary" onClick={runAgain}>
                    <RotateCcw /> Run it again, up to about ${totalEstimate(againPlans).toFixed(2)}
                </Button>
            )}

            {/* scroll-mt keeps the table's header clear of the dashboard's top bar when it scrolls into view. */}
            <div ref={results} className="scroll-mt-24">
                <ResultsTable jobs={collection.jobs} title={collection.search?.title ?? form.title} />
            </div>
        </div>
    );
}

/**
 * /dashboard/job-collection: job boards searched with Apify actors, from
 * this browser, on the user's own Apify account. Locked until this browser
 * has an Apify token (added in Settings).
 */
export function JobCollectionView({ accountId, country }: { accountId: string; country: string }) {
    return (
        <>
            <PageHeader
                title="Find jobs elsewhere"
                description="Search LinkedIn, Wuzzuf, Bayt and 36 more job sites at once. It runs on your own Apify account, from this browser."
            />
            <ApifyGate accountId={accountId}>
                {(token) => <Collector accountId={accountId} token={token} initialCountry={country} />}
            </ApifyGate>
        </>
    );
}
