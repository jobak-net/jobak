"use client";

import { useState } from "react";

import { Chip } from "@/frontend/components/ui";
import { SAMPLE_CV_SKILLS, SAMPLE_JOBS } from "@/frontend/lib/mocks/dashboard";

import { JobRow } from "../job-row";
import { CvDropzone, ResultArea, ResultSection, ResultSheet, RunButton, ToolInput, useSimulatedRun } from "./shared";

/** Upload a CV → the skills read from it → open jobs ranked against those skills. */
export function CvMatchTool() {
    const [file, setFile] = useState<File | null>(null);
    const { status, run } = useSimulatedRun(1600);
    const ranked = [...SAMPLE_JOBS].filter((job) => job.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ToolInput>
                <div>
                    <h2 className="text-[15px] font-semibold text-fg-primary">Match from your CV</h2>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">No preferences needed. We read your skills straight from the CV.</p>
                </div>
                <CvDropzone file={file} onFile={setFile} />
                <RunButton status={status} onClick={run}>
                    {file ? "Find matching jobs" : "Try a sample CV"}
                </RunButton>
            </ToolInput>

            <ResultArea status={status} emptyTitle="No matches yet" emptyHint="Add your CV and we'll rank open jobs against it.">
                <ResultSheet>
                    <ResultSection title="Skills we found">
                        <div className="flex flex-wrap gap-1.5">
                            {SAMPLE_CV_SKILLS.map((skill) => (
                                <Chip key={skill}>{skill}</Chip>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-fg-tertiary">Six years of experience, senior level, frontend focus</p>
                    </ResultSection>

                    <ResultSection title={`${ranked.length} jobs fit your CV`}>
                        <div className="-mx-3 divide-y divide-border-subtle">
                            {ranked.map((job, i) => (
                                <JobRow key={job.id} job={job} index={i} />
                            ))}
                        </div>
                    </ResultSection>
                </ResultSheet>
            </ResultArea>
        </div>
    );
}
