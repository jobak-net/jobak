import { useMemo } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/frontend/shared/lib";
import type { CvIssue, CvReviewResponse } from "@/shared/contracts/cv-review";

import { segmentsFor } from "../lib/highlights";
import { ResultSection } from "../../shared/components/tool-parts";

const PRIORITY: Record<CvIssue["priority"], { label: string; className: string }> = {
    1: { label: "Critical", className: "border-status-rose/40 text-status-rose" },
    2: { label: "Important", className: "border-status-amber/40 text-status-amber" },
    3: { label: "Optional", className: "border-border-standard text-fg-tertiary" },
};

/** What works, what doesn't, each issue with its fix, and the CV itself with those passages marked. */
export function ReviewFindings({ review, cvText }: { review: CvReviewResponse; cvText: string }) {
    return (
        <>
            <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <ResultSection title="What works">
                    <ul className="space-y-2.5">
                        {review.strengths.map((item) => (
                            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-score-high" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </ResultSection>
                <ResultSection title="What holds it back">
                    <ul className="space-y-2.5">
                        {review.weaknesses.map((item) => (
                            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </ResultSection>
            </div>

            {review.issues.length > 0 && (
                <ResultSection title="What to fix">
                    <ol className="space-y-4">
                        {review.issues.map((issue, index) => (
                            <li key={`${issue.issue}-${index}`} className="flex gap-3">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/6 text-[11px] font-semibold tabular-nums text-fg-secondary">
                                    {index + 1}
                                </span>
                                <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-fg-primary">{issue.issue}</p>
                                        <span
                                            className={cn(
                                                "rounded-full border px-2 py-px text-[11px] font-medium",
                                                PRIORITY[issue.priority].className,
                                            )}
                                        >
                                            {PRIORITY[issue.priority].label}
                                        </span>
                                    </div>
                                    {issue.quote && (
                                        <blockquote className="mt-1.5 border-l-2 border-status-amber/50 pl-3 text-fg-tertiary">
                                            “{issue.quote}”
                                        </blockquote>
                                    )}
                                    {issue.why && <p className="mt-1.5 text-fg-tertiary">{issue.why}</p>}
                                    {issue.suggestion && (
                                        <p className="mt-1.5 text-fg-secondary">
                                            <span className="font-medium">Try: </span>
                                            {issue.suggestion}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                    <MarkedUpCv review={review} cvText={cvText} />
                </ResultSection>
            )}
        </>
    );
}

/**
 * The CV as the AI read it, with each quoted passage highlighted and
 * numbered like its issue. Collapsed: it's long, and the list above already
 * quotes each passage.
 */
function MarkedUpCv({ review, cvText }: { review: CvReviewResponse; cvText: string }) {
    const segments = useMemo(
        () =>
            segmentsFor(cvText, [
                ...review.issues.flatMap((issue, index) =>
                    issue.quote ? [{ quote: issue.quote, label: index + 1, tone: "issue" as const }] : [],
                ),
                ...review.aiWriting.phrases.map((phrase) => ({ quote: phrase.quote, label: 0, tone: "phrase" as const })),
            ]),
        [review, cvText],
    );
    if (!segments.some((s) => s.highlight)) return null;

    return (
        <details className="mt-5 rounded-control border border-border-subtle">
            <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-fg-secondary">See them in your CV</summary>
            <div className="max-h-[28rem] overflow-auto border-t border-border-subtle p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-fg-tertiary">
                {segments.map((segment, i) =>
                    segment.highlight ? (
                        <mark
                            key={i}
                            className={cn(
                                "rounded-sm px-0.5 text-fg-primary",
                                segment.highlight.tone === "issue" ? "bg-status-amber/20" : "bg-accent/15",
                            )}
                        >
                            {segment.text}
                            {segment.highlight.label > 0 && (
                                <sup className="ml-0.5 font-sans text-[10px] font-semibold text-status-amber">{segment.highlight.label}</sup>
                            )}
                        </mark>
                    ) : (
                        <span key={i}>{segment.text}</span>
                    ),
                )}
            </div>
            <p className="border-t border-border-subtle px-3 py-2 text-xs text-fg-quaternary">
                Amber: an issue above, by its number. Blue: wording that reads as generated (below).
            </p>
        </details>
    );
}
