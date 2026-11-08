"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { Chip } from "@/frontend/components/ui";
import { SAMPLE_CV_REPORT } from "@/frontend/lib/mocks/dashboard";

import { ScoreRing, scoreColor } from "../score-ring";
import { CvDropzone, ResultArea, ResultSection, ResultSheet, RunButton, ToolInput, useSimulatedRun } from "./shared";

/** Upload a CV, get a scored report: overall, ATS, per section, fixes, keywords. */
export function CvReviewTool() {
    const [file, setFile] = useState<File | null>(null);
    const { status, run } = useSimulatedRun();
    const report = SAMPLE_CV_REPORT;

    return (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ToolInput>
                <div>
                    <h2 className="text-[15px] font-semibold text-fg-primary">Your CV</h2>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">Scored the way recruiters and ATS software read it.</p>
                </div>
                <CvDropzone file={file} onFile={setFile} />
                <RunButton status={status} onClick={run}>
                    {file ? "Review my CV" : "Try a sample CV"}
                </RunButton>
            </ToolInput>

            <ResultArea status={status} emptyTitle="No review yet" emptyHint="Add your CV and run the review to see your score and what to fix.">
                <ResultSheet>
                    <ResultSection>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="flex items-center gap-4">
                                <ScoreRing score={report.overall} size={68} stroke={5} />
                                <div>
                                    <p className="text-sm font-medium text-fg-primary">Overall</p>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-fg-tertiary">A few targeted fixes would lift it above 85.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <ScoreRing score={report.ats} size={68} stroke={5} />
                                <div>
                                    <p className="text-sm font-medium text-fg-primary">ATS compatibility</p>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-fg-tertiary">Most parsers will read it. The layout is the main risk.</p>
                                </div>
                            </div>
                        </div>
                    </ResultSection>

                    <ResultSection title="By section">
                        <ul className="space-y-4">
                            {report.sections.map((section) => (
                                <li key={section.name} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
                                    <div className="flex items-center justify-between text-[13px] sm:block">
                                        <span className="font-medium text-fg-secondary">{section.name}</span>
                                        <span className="tabular-nums sm:ml-2" style={{ color: scoreColor(section.score) }}>
                                            {section.score}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                                            <div className="h-full rounded-full" style={{ width: `${section.score}%`, background: scoreColor(section.score) }} />
                                        </div>
                                        <p className="mt-1.5 text-xs text-fg-tertiary">{section.note}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ResultSection>

                    <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                        <ResultSection title="What works">
                            <ul className="space-y-2.5">
                                {report.strengths.map((item) => (
                                    <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-score-high" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </ResultSection>
                        <ResultSection title="What to fix">
                            <ul className="space-y-2.5">
                                {report.improvements.map((item) => (
                                    <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-amber" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </ResultSection>
                    </div>

                    <ResultSection title="Keywords for frontend roles">
                        <p className="mb-2 text-xs text-fg-tertiary">On your CV</p>
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {report.keywords.found.map((keyword) => (
                                <Chip key={keyword} dot="var(--score-high)">{keyword}</Chip>
                            ))}
                        </div>
                        <p className="mb-2 text-xs text-fg-tertiary">Worth adding</p>
                        <div className="flex flex-wrap gap-1.5">
                            {report.keywords.missing.map((keyword) => (
                                <Chip key={keyword} dot="var(--status-amber)">{keyword}</Chip>
                            ))}
                        </div>
                    </ResultSection>
                </ResultSheet>
            </ResultArea>
        </div>
    );
}
