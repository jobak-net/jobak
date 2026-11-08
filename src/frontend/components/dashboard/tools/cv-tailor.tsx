"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Chip, Field, Textarea } from "@/frontend/components/ui";
import { SAMPLE_TAILORED_CV } from "@/frontend/lib/mocks/dashboard";

import { ScoreRing } from "../score-ring";
import { CvDropzone, ResultArea, ResultSection, ResultSheet, RunButton, ToolInput, useSimulatedRun } from "./shared";

/** Paste a job description; get the CV rewritten to fit it, with the match before and after. */
export function CvTailorTool() {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");
    const { status, run } = useSimulatedRun(1800);
    const result = SAMPLE_TAILORED_CV;

    return (
        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            <ToolInput>
                <Field label="Job description" hint="Paste the whole posting. The requirements matter most.">
                    <Textarea
                        rows={9}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="We're looking for a Senior Frontend Engineer to…"
                    />
                </Field>
                <Field label="Your current CV">
                    <CvDropzone file={file} onFile={setFile} />
                </Field>
                <RunButton status={status} onClick={run}>
                    Tailor my CV
                </RunButton>
            </ToolInput>

            <ResultArea status={status} emptyTitle="Nothing tailored yet" emptyHint="Paste a job description and run it to get a version of your CV written for that role.">
                <ResultSheet>
                    <ResultSection>
                        <div className="flex flex-wrap items-center gap-5">
                            <div className="flex items-center gap-3">
                                <ScoreRing score={result.matchBefore} size={56} stroke={4} />
                                <div>
                                    <p className="text-xs text-fg-tertiary">Before</p>
                                    <p className="text-sm font-medium text-fg-primary">Partial fit</p>
                                </div>
                            </div>
                            <ArrowRight className="size-4 text-fg-quaternary" />
                            <div className="flex items-center gap-3">
                                <ScoreRing score={result.matchAfter} size={56} stroke={4} />
                                <div>
                                    <p className="text-xs text-fg-tertiary">After</p>
                                    <p className="text-sm font-medium text-fg-primary">Strong fit</p>
                                </div>
                            </div>
                        </div>
                    </ResultSection>

                    <ResultSection title="Professional summary">
                        <p className="max-w-[70ch] text-sm leading-relaxed text-fg-secondary">{result.summary}</p>
                    </ResultSection>

                    <ResultSection title="Experience, rewritten for this role">
                        <ul className="max-w-[70ch] list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                            {result.bullets.map((bullet) => (
                                <li key={bullet}>{bullet}</li>
                            ))}
                        </ul>
                    </ResultSection>

                    <ResultSection title="Keywords added from the posting">
                        <div className="flex flex-wrap gap-1.5">
                            {result.addedKeywords.map((keyword) => (
                                <Chip key={keyword} dot="var(--score-high)">{keyword}</Chip>
                            ))}
                        </div>
                    </ResultSection>
                </ResultSheet>
            </ResultArea>
        </div>
    );
}
