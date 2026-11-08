import { MapPin } from "lucide-react";

import { Chip } from "@/frontend/components/ui";
import type { Job } from "@/frontend/types/dashboard";

import { ScoreRing } from "./score-ring";

/** A source's dot colour, hashed into the shared hue ramp so new sources look native. */
export function sourceHue(source: string): string {
    let hash = 0;
    for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return `var(--hue-${(hash % 8) + 1})`;
}

const WORKPLACE_LABEL: Record<Job["workplace"], string> = {
    remote: "Remote",
    onsite: "On-site",
    hybrid: "Hybrid",
};

/** One job, compact — for lists inside a card. */
export function JobRow({ job, index = 0 }: { job: Job; index?: number }) {
    return (
        <a
            href={job.link}
            target={job.link === "#" ? undefined : "_blank"}
            rel="noreferrer"
            className="dash-enter group flex items-center gap-4 rounded-control p-3 transition-colors hover:bg-white/3"
            style={{ "--dash-delay": `${index * 60}ms` } as React.CSSProperties}
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white/5 text-sm font-semibold text-fg-tertiary transition-colors group-hover:bg-accent/12 group-hover:text-accent">
                {job.company.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg-primary">{job.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-tertiary">
                    {job.company}
                    <span aria-hidden="true">·</span>
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{job.location}</span>
                </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
                <Chip dot={sourceHue(job.source)}>{job.source}</Chip>
                <Chip>{WORKPLACE_LABEL[job.workplace]}</Chip>
            </div>
            <ScoreRing score={job.score} size={40} />
        </a>
    );
}
