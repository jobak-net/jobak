"use client";

import { Download, ExternalLink } from "lucide-react";

import { Button } from "@/frontend/shared/ui";

import { actorById } from "../config/actors";
import { toCsv } from "../lib/results";
import type { CollectedJob } from "../types/catalogue";

/** "3 days ago" for ISO dates; text the board wrote ("2 days ago") as it is. */
function postedText(postedAt: string | null): string | null {
    if (!postedAt) return null;
    const time = Date.parse(postedAt);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(postedAt) || Number.isNaN(time)) return postedAt;
    const days = Math.floor((Date.now() - time) / 86_400_000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 60) return `${days} days ago`;
    return new Date(time).toLocaleDateString("en", { month: "short", year: "numeric" });
}

function downloadCsv(jobs: CollectedJob[], title: string) {
    const blob = new Blob([`﻿${toCsv(jobs)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "search"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * The jobs from every site, duplicates merged, newest first. Everything is
 * rendered as text; links are http(s) only (checked when read) and open the
 * original listing in a new tab.
 */
export function ResultsTable({ jobs, title }: { jobs: CollectedJob[]; title: string }) {
    if (jobs.length === 0) return null;
    return (
        <section className="rounded-card border border-border-subtle bg-white/2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
                <h2 className="text-[15px] font-semibold text-fg-primary">
                    {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
                </h2>
                <Button variant="secondary" size="sm" onClick={() => downloadCsv(jobs, title)}>
                    <Download /> Download CSV
                </Button>
            </div>
            <ul className="divide-y divide-border-subtle">
                {jobs.map((job) => {
                    const meta = [job.company, job.location, postedText(job.postedAt), job.salary].filter(Boolean);
                    return (
                        <li key={`${job.site}:${job.url}`} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-fg-primary">{job.title}</p>
                                <p className="mt-0.5 text-[13px] text-fg-tertiary">{meta.join(" · ")}</p>
                            </div>
                            <span className="rounded-full border border-border-standard px-2 py-0.5 text-[11px] text-fg-tertiary">
                                {actorById(job.site)?.site ?? job.site}
                            </span>
                            <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[13px] text-accent-text underline-offset-2 hover:underline"
                            >
                                Open <ExternalLink className="size-3.5" />
                            </a>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
