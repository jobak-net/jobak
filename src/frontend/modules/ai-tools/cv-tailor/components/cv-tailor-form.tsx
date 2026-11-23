"use client";

import { useId } from "react";
import { Target } from "lucide-react";

import { Button, Field, Input, Textarea } from "@/frontend/shared/ui";
import { CV_TAILOR_LIMITS as L } from "@/shared/contracts/cv-tailor";

import type { useCvTailor } from "../hooks/use-cv-tailor";
import { CvInput } from "../../shared/components/cv-input";
import { PostingCheck } from "../../shared/components/posting-check";
import { ToolInput } from "../../shared/components/tool-parts";

/** The input column: the job (the posting, checked for planted text) and the CV to tailor to it. */
export function CvTailorForm({ tool }: { tool: ReturnType<typeof useCvTailor> }) {
    const id = useId();
    const missing = tool.postingTooShort ? "the job posting" : tool.cv.tooShort ? "your CV" : null;

    return (
        <ToolInput>
            <div>
                <h2 className="text-[15px] font-semibold text-fg-primary">The job</h2>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">The requirements matter most.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Company (optional)" htmlFor={`${id}-company`}>
                    <Input
                        id={`${id}-company`}
                        value={tool.job.company}
                        onChange={(event) => tool.setJobField("company", event.target.value)}
                        maxLength={L.company}
                        placeholder="Khazna"
                    />
                </Field>
                <Field label="Job title (optional)" htmlFor={`${id}-title`}>
                    <Input
                        id={`${id}-title`}
                        value={tool.job.title}
                        onChange={(event) => tool.setJobField("title", event.target.value)}
                        maxLength={L.jobTitle}
                        placeholder="Back End Developer"
                    />
                </Field>
            </div>

            <Field
                label="Job posting"
                htmlFor={`${id}-posting`}
                hint={
                    tool.postingTooLong
                        ? `Too long: ${tool.descriptionLength.toLocaleString()} of ${L.descriptionMax.toLocaleString()} characters. Keep the requirements and responsibilities.`
                        : "Paste the whole posting. It's checked for text planted for AI tools."
                }
            >
                <Textarea
                    id={`${id}-posting`}
                    rows={9}
                    value={tool.job.description}
                    onChange={(event) => tool.setJobField("description", event.target.value)}
                    placeholder="Paste the job posting here"
                    aria-invalid={tool.postingTooLong}
                />
            </Field>

            <PostingCheck findings={tool.scan.findings} />

            <div className="border-t border-border-subtle pt-5">
                <h2 className="text-[15px] font-semibold text-fg-primary">Your CV</h2>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">Tailored to the job without inventing anything.</p>
            </div>

            <CvInput input={tool.cv} action="analyse it" />

            <div>
                <Button variant="primary" className="w-full" onClick={tool.openPicker} disabled={!tool.canAnalyze}>
                    <Target /> Analyse the match
                </Button>
                <p aria-live="polite" className="mt-2 min-h-5 text-[13px]">
                    {tool.error ? (
                        <span role="alert" className="text-status-rose">
                            {tool.error}
                        </span>
                    ) : tool.cv.reading ? null : missing ? (
                        <span className="text-fg-tertiary">Add {missing} to analyse the match.</span>
                    ) : null}
                </p>
            </div>
        </ToolInput>
    );
}
