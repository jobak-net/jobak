import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { ScoreRing, scoreColor } from "@/frontend/shared/ui";
import { findAiModel } from "@/shared/ai";
import { CV_RATING_LABEL, type CvReviewResponse } from "@/shared/contracts/cv-review";

import { ResultSection } from "../../shared/components/tool-parts";

/** The score, what it means, and the first impression; then each category's share of it. */
export function ReviewOverview({ review }: { review: CvReviewResponse }) {
    const model = findAiModel(review.provider, review.model)?.label ?? review.model;

    return (
        <>
            <ResultSection>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <ScoreRing score={review.score} size={76} stroke={5} />
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-fg-primary">{CV_RATING_LABEL[review.rating]}</p>
                        {review.careerLevel && (
                            <p className="mt-0.5 text-[13px] text-fg-tertiary">
                                Reads as {review.careerLevel}
                                {review.targetRole ? `, reviewed for ${review.targetRole}` : ""}
                            </p>
                        )}
                        {review.summary && <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{review.summary}</p>}
                        {review.firstImpression && (
                            <p className="mt-3 text-[13px] leading-relaxed text-fg-tertiary">
                                <span className="font-medium text-fg-secondary">In the first 10 seconds: </span>
                                {review.firstImpression}
                            </p>
                        )}
                        <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                            Scored by {PROVIDER_INFO[review.provider].name}, {model}, on the CV review scorecard. It&apos;s an
                            evaluation framework, not a real ATS score, and no tool can promise one.
                        </p>
                    </div>
                </div>
            </ResultSection>

            <ResultSection title="Score breakdown">
                <ul className="space-y-4">
                    {review.categories.map((category) => {
                        const percent = Math.round((category.score / category.max) * 100);
                        return (
                            <li key={category.id} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                                <div className="flex items-center justify-between text-[13px] sm:block">
                                    <span className="font-medium text-fg-secondary">{category.label}</span>
                                    <span className="tabular-nums sm:ml-2" style={{ color: scoreColor(percent) }}>
                                        {category.score}/{category.max}
                                    </span>
                                </div>
                                <div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                                        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: scoreColor(percent) }} />
                                    </div>
                                    {category.feedback && <p className="mt-1.5 text-xs text-fg-tertiary">{category.feedback}</p>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </ResultSection>
        </>
    );
}
