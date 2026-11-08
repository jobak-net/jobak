"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, BriefcaseBusiness, ExternalLink, MapPin, Search, Wallet } from "lucide-react";

import { toggleBookmarkAction } from "@/backend/actions/jobs";
import { Card, Chip, FilterChip, Input } from "@/frontend/components/ui";
import { cn } from "@/frontend/lib/utils/utils";
import type { Job } from "@/frontend/types/dashboard";

import { sourceHue } from "./job-row";
import { ScoreRing } from "./score-ring";

type Filter = "all" | "top" | "remote" | "saved";

const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "top", label: "Top matches" },
    { id: "remote", label: "Remote" },
    { id: "saved", label: "Saved" },
];

/**
 * The full job list: search, filters, bookmarks.
 *
 * Filtering is in the browser — the list is at most a hundred jobs, already
 * narrowed by the user's preferences on the server. The search box starts from
 * `?q=` so the top bar's search lands here pre-filled.
 *
 * `sample` jobs are not in the database, so bookmarking them changes this view
 * only; real jobs go through the server action and are rolled back if it fails.
 */
export function JobList({
    jobs: initialJobs,
    sample,
    initialFilter = "all",
    lockFilter = false,
}: {
    jobs: Job[];
    sample: boolean;
    initialFilter?: Filter;
    /** Saved jobs page: the filter is the page, so the chips are hidden. */
    lockFilter?: boolean;
}) {
    const searchParams = useSearchParams();
    const [jobs, setJobs] = useState(initialJobs);
    const [filter, setFilter] = useState<Filter>(initialFilter);
    const [query, setQuery] = useState(searchParams.get("q") ?? "");
    const [, startTransition] = useTransition();

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return jobs
            .filter((job) => {
                if (filter === "top" && (job.score ?? 0) < 80) return false;
                if (filter === "remote" && job.workplace !== "remote") return false;
                if (filter === "saved" && !job.bookmarked) return false;
                if (!q) return true;
                return [job.title, job.company, job.location, ...(job.tags ?? [])].some((field) =>
                    field.toLowerCase().includes(q),
                );
            })
            .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    }, [jobs, filter, query]);

    function toggleBookmark(id: string) {
        const flip = (list: Job[]) => list.map((j) => (j.id === id ? { ...j, bookmarked: !j.bookmarked } : j));
        setJobs(flip);

        if (sample) return;
        startTransition(async () => {
            try {
                await toggleBookmarkAction(id);
            } catch {
                setJobs(flip); // undo
            }
        });
    }

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!lockFilter && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {FILTERS.map((f) => (
                            <FilterChip
                                key={f.id}
                                selected={filter === f.id}
                                neutral={f.id === "all"}
                                onClick={() => setFilter(f.id)}
                            >
                                {f.label}
                            </FilterChip>
                        ))}
                    </div>
                )}
                <div className="relative sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-quaternary" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter by title, company, skill…"
                        aria-label="Filter jobs"
                        className="pl-9"
                    />
                </div>
            </div>

            <p className="mb-3 text-[13px] text-fg-tertiary" aria-live="polite">
                {visible.length} {visible.length === 1 ? "job" : "jobs"}
            </p>

            {visible.length === 0 ? (
                <Card className="flex flex-col items-center py-14 text-center">
                    <BriefcaseBusiness className="size-8 text-fg-quaternary" />
                    <p className="mt-3 text-sm font-medium text-fg-primary">Nothing here yet</p>
                    <p className="mt-1 max-w-sm text-[13px] text-fg-tertiary">
                        {filter === "saved"
                            ? "Bookmark a match and it will be kept here."
                            : "Try a different filter or search term."}
                    </p>
                </Card>
            ) : (
                <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-(image:--surface-1)">
                    {visible.map((job, i) => (
                        <li
                            key={job.id}
                            className="dash-enter flex flex-col gap-4 p-5 transition-colors hover:bg-white/2 sm:flex-row sm:items-start"
                            style={{ "--dash-delay": `${Math.min(i, 8) * 40}ms` } as React.CSSProperties}
                        >
                                <ScoreRing score={job.score} size={52} />

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">
                                                {job.title}
                                            </h3>
                                            <p className="mt-0.5 text-[13px] text-fg-tertiary">{job.company}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleBookmark(job.id)}
                                            aria-pressed={job.bookmarked}
                                            aria-label={job.bookmarked ? "Remove bookmark" : "Bookmark job"}
                                            className="rounded-control p-2 text-fg-tertiary transition-colors hover:bg-white/4 hover:text-fg-primary"
                                        >
                                            <Bookmark
                                                className={cn("size-[18px]", job.bookmarked && "fill-accent text-accent")}
                                            />
                                        </button>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-tertiary">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="size-3.5" />
                                            {job.location}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Wallet className="size-3.5" />
                                            {job.salary}
                                        </span>
                                        <span>{job.postedAt}</span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <Chip dot={sourceHue(job.source)}>{job.source}</Chip>
                                        <Chip className="capitalize">{job.type.replace("-", " ")}</Chip>
                                        {job.tags?.slice(0, 4).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                                    </div>

                                    {job.matchReasons && job.matchReasons.length > 0 && (
                                        <ul className="mt-3 space-y-1 border-l-2 border-score-high/30 pl-3 text-[12.5px] text-fg-secondary">
                                            {job.matchReasons.map((reason) => (
                                                <li key={reason}>{reason}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {job.link !== "#" && (
                                    <a
                                        href={job.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 self-start rounded-control border border-border-standard px-3 py-1.5 text-[13px] text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
                                    >
                                        Apply
                                        <ExternalLink className="size-3.5" />
                                    </a>
                                )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
