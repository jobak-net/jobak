"use client";

import { CheckCircle2, CircleAlert, Loader2, Sparkles } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { Button } from "@/frontend/shared/ui";
import type { CvImproveResponse, CvReviewResponse } from "@/shared/contracts/cv-review";

import { documentTitle } from "../../shared/lib/export-document";
import { CvEditor } from "../../shared/components/cv-editor";
import { ScoreComparison } from "../../shared/components/score-comparison";
import { ResultSection } from "../../shared/components/tool-parts";

/**
 * The improved CV: asked for after the review (the CV review skill never
 * rewrites first), on the same provider. Then the scores side by side, what
 * changed, what only the user can add, and the CV itself, editable, to copy
 * or save as Word or PDF (made in the browser). What it claims beyond the
 * original is re-checked as the user edits.
 */
export function ImprovedCv({
    review,
    original,
    improved,
    text,
    onTextChange,
    improving,
    error,
    onImprove,
    name,
}: {
    review: CvReviewResponse;
    /** The CV text the review was made on. */
    original: string;
    improved: CvImproveResponse | null;
    text: string;
    onTextChange: (text: string) => void;
    improving: boolean;
    error: string | null;
    onImprove: () => void;
    /** The account's name, for the file name. */
    name: string;
}) {
    // Nothing on the scorecard left to gain: a rewrite could only lose points, so it isn't offered.
    const nothingToFix = review.score >= 100 || review.issues.length === 0;
    if (!improved && nothingToFix) {
        return (
            <ResultSection>
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg-primary">
                    <CheckCircle2 className="size-4 text-score-high" /> Nothing to improve
                </h3>
                <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-fg-tertiary">
                    {review.score >= 100
                        ? "Your CV scored 100 on this scorecard, so a rewrite could only make it worse. Keep it as it is."
                        : "The review found nothing to fix, so there's nothing to rewrite. Keep it as it is."}
                </p>
            </ResultSection>
        );
    }

    if (!improved) {
        return (
            <ResultSection>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">The improved CV</h3>
                        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-fg-tertiary">
                            {PROVIDER_INFO[review.provider].name} rewrites it to fix what&apos;s above, in plain professional language,
                            without adding anything your CV doesn&apos;t say. What only you can add, it asks for.
                        </p>
                    </div>
                    <Button variant="primary" onClick={onImprove} disabled={improving} className="shrink-0">
                        {improving ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        {improving ? "Writing…" : "Write the improved CV"}
                    </Button>
                </div>
                <p aria-live="polite" className="mt-3 text-[13px] leading-relaxed">
                    {error ? (
                        <span role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                        </span>
                    ) : improving ? (
                        <span className="text-fg-tertiary">This takes up to a minute.</span>
                    ) : review.score >= 90 ? (
                        <span className="text-fg-tertiary">
                            Your CV already scores {review.score}. A rewrite changes only what the review flagged, and may not
                            raise the score.
                        </span>
                    ) : (
                        <span className="text-fg-quaternary">
                            On a free tier, your provider may need a minute between the review and this.
                        </span>
                    )}
                </p>
            </ResultSection>
        );
    }

    return <ImprovedResult review={review} original={original} improved={improved} text={text} onTextChange={onTextChange} name={name} />;
}

function ImprovedResult({
    review,
    original,
    improved,
    text,
    onTextChange,
    name,
}: {
    review: CvReviewResponse;
    original: string;
    improved: CvImproveResponse;
    text: string;
    onTextChange: (text: string) => void;
    name: string;
}) {
    return (
        <>
            <ScoreComparison
                before={review.categories}
                beforeTotal={review.score}
                after={improved.categories}
                afterTotal={improved.score}
                noun="rewrite"
            />

            <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <ResultSection title="What changed">
                    <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                        {improved.changes.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </ResultSection>
                <ResultSection title="Only you can add">
                    {improved.stillNeeded.length > 0 ? (
                        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                            {improved.stillNeeded.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-fg-tertiary">Nothing it needed to ask.</p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                        Real numbers and details make the biggest difference. Add them yourself below; nothing was made up for you.
                    </p>
                </ResultSection>
            </div>

            <CvEditor
                title="Your improved CV"
                text={text}
                onTextChange={onTextChange}
                original={original}
                file={{ title: documentTitle("CV", name, review.targetRole), author: name }}
            />
        </>
    );
}
