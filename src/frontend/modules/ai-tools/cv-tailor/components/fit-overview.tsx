import { CheckCircle2, CircleAlert } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { ScoreRing, scoreColor } from "@/frontend/shared/ui";
import { findAiModel } from "@/shared/ai";
import { FIT_RATING_LABEL, type CvFitResponse } from "@/shared/contracts/cv-tailor";

import { ResultSection } from "../../shared/components/tool-parts";

/** The match score and what it means, each category's share, and the fit in strengths and gaps. */
export function FitOverview({ fit, job }: { fit: CvFitResponse; job: { company: string; title: string } }) {
    const model = findAiModel(fit.provider, fit.model)?.label ?? fit.model;
    const target = [job.title, job.company].filter(Boolean).join(" at ");

    return (
        <>
            <ResultSection>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <ScoreRing score={fit.score} size={76} stroke={5} />
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-fg-primary">{FIT_RATING_LABEL[fit.rating]}</p>
                        {target && <p className="mt-0.5 text-[13px] text-fg-tertiary">For {target}</p>}
                        {fit.summary && <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{fit.summary}</p>}
                        {fit.positioning && (
                            <p className="mt-3 text-[13px] leading-relaxed text-fg-tertiary">
                                <span className="font-medium text-fg-secondary">How to present yourself: </span>
                                {fit.positioning}
                            </p>
                        )}
                        <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                            Scored by {PROVIDER_INFO[fit.provider].name}, {model}, on the CV tailoring rubric. It&apos;s an estimate,
                            not an ATS score or a hiring probability.
                        </p>
                    </div>
                </div>
            </ResultSection>

            <ResultSection title="Score breakdown">
                <ul className="space-y-4">
                    {fit.categories.map((category) => {
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

            <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <ResultSection title="Where you fit">
                    <ul className="space-y-2.5">
                        {fit.strengths.map((item) => (
                            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-score-high" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </ResultSection>
                <ResultSection title="What's missing">
                    {fit.gaps.length > 0 ? (
                        <ul className="space-y-2.5">
                            {fit.gaps.map((item) => (
                                <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-fg-tertiary">Nothing the posting asks for is missing from your CV.</p>
                    )}
                </ResultSection>
            </div>
        </>
    );
}
