import { useMemo } from "react";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";

import { Chip } from "@/frontend/shared/ui";
import { findAiTells } from "@/shared/ai-tools";
import type { AiWritingRating, CvReviewResponse } from "@/shared/contracts/cv-review";

import { ResultSection } from "../../shared/components/tool-parts";

const STATUS = {
    pass: { Icon: CheckCircle2, className: "text-score-high", label: "Passes" },
    warn: { Icon: CircleAlert, className: "text-status-amber", label: "Could be better" },
    fail: { Icon: XCircle, className: "text-status-rose", label: "Problem" },
} as const;

const AI_RATING: Record<AiWritingRating, string> = {
    natural: "Natural",
    "mostly-natural": "Mostly natural",
    "some-ai-patterns": "Some AI-like patterns",
    "highly-generic": "Highly generic, reads as AI-written",
};

/** How an ATS would handle it (checks and keywords), and how much of it reads as generated. */
export function ReviewAts({ review, cvText }: { review: CvReviewResponse; cvText: string }) {
    // The same word list the cover letter checks, on the CV as the AI read it.
    const tells = useMemo(() => findAiTells(cvText).filter((t) => !t.includes("(")), [cvText]);

    return (
        <>
            <ResultSection title="ATS check">
                {review.ats.checks.length > 0 && (
                    <ul className="space-y-2.5">
                        {review.ats.checks.map((check) => {
                            const { Icon, className, label } = STATUS[check.status];
                            return (
                                <li key={check.label} className="flex gap-2.5 text-[13px] leading-relaxed">
                                    <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-label={label} />
                                    <span>
                                        <span className="font-medium text-fg-secondary">{check.label}</span>
                                        {check.detail && <span className="text-fg-tertiary">: {check.detail}</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {(review.ats.keywordsFound.length > 0 || review.ats.keywordsMissing.length > 0) && (
                    <div className="mt-5">
                        {review.ats.keywordsFound.length > 0 && (
                            <>
                                <p className="mb-2 text-xs text-fg-tertiary">
                                    Keywords{review.targetRole ? ` for ${review.targetRole}` : ""} your CV supports
                                </p>
                                <div className="mb-4 flex flex-wrap gap-1.5">
                                    {review.ats.keywordsFound.map((keyword) => (
                                        <Chip key={keyword} dot="var(--score-high)">
                                            {keyword}
                                        </Chip>
                                    ))}
                                </div>
                            </>
                        )}
                        {review.ats.keywordsMissing.length > 0 && (
                            <>
                                <p className="mb-2 text-xs text-fg-tertiary">
                                    Missing. Add one only if it&apos;s true of your work.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {review.ats.keywordsMissing.map((keyword) => (
                                        <Chip key={keyword} dot="var(--status-amber)">
                                            {keyword}
                                        </Chip>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </ResultSection>

            <ResultSection title="Does it read as AI-written?">
                <p className="text-[13px] leading-relaxed text-fg-secondary">
                    <span className="font-medium text-fg-primary">{AI_RATING[review.aiWriting.rating]}. </span>
                    {review.aiWriting.note}
                </p>
                {review.aiWriting.phrases.length > 0 && (
                    <ul className="mt-4 space-y-3">
                        {review.aiWriting.phrases.map((phrase) => (
                            <li key={phrase.quote} className="text-[13px] leading-relaxed">
                                <p className="text-fg-tertiary line-through decoration-fg-quaternary/60">“{phrase.quote}”</p>
                                <p className="mt-0.5 text-fg-secondary">“{phrase.alternative}”</p>
                            </li>
                        ))}
                    </ul>
                )}
                {tells.length > 0 && (
                    <p className="mt-4 text-[13px] leading-relaxed text-fg-tertiary">
                        Words that often read as generated: {tells.map((t) => `“${t}”`).join(", ")}.
                    </p>
                )}
                <p className="mt-3 text-xs text-fg-quaternary">
                    No one can tell AI writing apart with certainty; these are patterns that often read that way.
                </p>
            </ResultSection>
        </>
    );
}
