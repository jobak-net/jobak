"use client";

import { CircleAlert, Loader2, Sparkles } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { Button, Chip } from "@/frontend/shared/ui";
import type { CvFitResponse, CvTailorResponse } from "@/shared/contracts/cv-tailor";

import { documentTitle } from "../../shared/lib/export-document";
import { CvEditor } from "../../shared/components/cv-editor";
import { ScoreComparison } from "../../shared/components/score-comparison";
import { ResultSection } from "../../shared/components/tool-parts";

/**
 * The tailored CV: asked for after the analysis (the skill never rewrites
 * before analysing), on the same provider. Then the scores side by side,
 * what changed, the posting's keywords it now uses, the gaps that remain
 * (never hidden), and the CV itself, editable, to copy or save as Word or PDF.
 */
export function TailoredCv({
    fit,
    original,
    job,
    plantedWords,
    tailored,
    text,
    onTextChange,
    tailoring,
    error,
    onTailor,
    name,
}: {
    fit: CvFitResponse;
    /** The CV text the analysis was made on. */
    original: string;
    job: { company: string; title: string };
    /** Words the posting planted for AI tools: flagged if they reach the CV. */
    plantedWords: string[];
    tailored: CvTailorResponse | null;
    text: string;
    onTextChange: (text: string) => void;
    tailoring: boolean;
    error: string | null;
    onTailor: () => void;
    /** The name on applications, for the file name. */
    name: string;
}) {
    if (!tailored) {
        return (
            <ResultSection>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">The tailored CV</h3>
                        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-fg-tertiary">
                            {PROVIDER_INFO[fit.provider].name} rewrites your CV for this job: the most relevant experience first,
                            the posting&apos;s terms where your CV supports them. Your history, titles and dates stay as they are, and
                            nothing is invented.
                        </p>
                    </div>
                    <Button variant="primary" onClick={onTailor} disabled={tailoring} className="shrink-0">
                        {tailoring ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        {tailoring ? "Writing…" : "Write the tailored CV"}
                    </Button>
                </div>
                <p aria-live="polite" className="mt-3 text-[13px] leading-relaxed">
                    {error ? (
                        <span role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                        </span>
                    ) : tailoring ? (
                        <span className="text-fg-tertiary">This takes up to a minute.</span>
                    ) : (
                        <span className="text-fg-quaternary">
                            On a free tier, your provider may need a minute between the analysis and this.
                        </span>
                    )}
                </p>
            </ResultSection>
        );
    }

    return (
        <>
            <ScoreComparison
                before={fit.categories}
                beforeTotal={fit.score}
                after={tailored.categories}
                afterTotal={tailored.score}
                noun="tailored CV"
            />

            <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <ResultSection title="What changed">
                    <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                        {tailored.changes.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </ResultSection>
                <ResultSection title="Still missing">
                    {tailored.gaps.length > 0 ? (
                        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                            {tailored.gaps.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-fg-tertiary">No gaps left that the posting asks about.</p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                        A gap is left out of the CV, not covered up. Address it in your cover letter or the interview.
                    </p>
                </ResultSection>
            </div>

            {(tailored.keywords.length > 0 || tailored.recommendations.length > 0) && (
                <ResultSection title="For this application">
                    {tailored.keywords.length > 0 && (
                        <>
                            <p className="mb-2 text-xs text-fg-tertiary">The posting&apos;s terms your CV now uses</p>
                            <div className="mb-4 flex flex-wrap gap-1.5">
                                {tailored.keywords.map((keyword) => (
                                    <Chip
                                        key={keyword}
                                        dot={tailored.unsupportedKeywords.includes(keyword) ? "var(--status-rose)" : "var(--score-high)"}
                                    >
                                        {keyword}
                                    </Chip>
                                ))}
                            </div>
                            {tailored.unsupportedKeywords.length > 0 && (
                                <p role="alert" className="mb-4 flex items-start gap-2 text-[13px] leading-relaxed text-status-rose">
                                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        {tailored.unsupportedKeywords.map((k) => `“${k}”`).join(", ")}{" "}
                                        {tailored.unsupportedKeywords.length === 1 ? "isn't" : "aren't"} in your original CV. Keep{" "}
                                        {tailored.unsupportedKeywords.length === 1 ? "it" : "them"} only if you really have that experience.
                                    </span>
                                </p>
                            )}
                        </>
                    )}
                    {tailored.recommendations.length > 0 && (
                        <>
                            <p className="mb-2 text-xs text-fg-tertiary">Beyond the CV</p>
                            <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                                {tailored.recommendations.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </ResultSection>
            )}

            <CvEditor
                title="Your tailored CV"
                text={text}
                onTextChange={onTextChange}
                original={original}
                plantedWords={plantedWords}
                file={{ title: documentTitle("CV", name, job.company || job.title), author: name }}
            />
        </>
    );
}
