"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

import { Chip, Field, Input } from "@/frontend/components/ui";
import { SAMPLE_INTERVIEW_QUESTIONS } from "@/frontend/lib/mocks/dashboard";

import { ResultArea, RunButton, ToolInput, useSimulatedRun } from "./shared";

/** A role (and optionally a company) → likely questions, each with how to answer. */
export function InterviewPrepTool() {
    const [role, setRole] = useState("Senior Frontend Engineer");
    const [company, setCompany] = useState("");
    const { status, run } = useSimulatedRun();

    return (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <ToolInput>
                <Field label="Role">
                    <Input value={role} onChange={(event) => setRole(event.target.value)} />
                </Field>
                <Field label="Company" hint="Optional. Adds questions about the company itself.">
                    <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Talabat" />
                </Field>
                <RunButton status={status} onClick={run} disabled={!role.trim()}>
                    Prepare questions
                </RunButton>
            </ToolInput>

            <ResultArea status={status} emptyTitle="No questions yet" emptyHint="Tell us the role and we'll put together the questions you're likely to face.">
                <div>
                    <p className="mb-3 text-[13px] text-fg-tertiary">
                        {SAMPLE_INTERVIEW_QUESTIONS.length} questions for {role || "this role"}
                        {company ? ` at ${company}` : ""}
                    </p>
                    <div className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-(image:--surface-1)">
                        {SAMPLE_INTERVIEW_QUESTIONS.map((item, i) => (
                            <details key={item.question} open={i === 0} className="group">
                                <summary className="flex cursor-pointer list-none items-start gap-4 p-5 transition-colors hover:bg-white/2 [&::-webkit-details-marker]:hidden">
                                    <span className="mt-0.5 w-5 shrink-0 text-xs tabular-nums text-fg-quaternary">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-relaxed text-fg-primary">{item.question}</p>
                                        <Chip className="mt-2">{item.category}</Chip>
                                    </div>
                                    <ChevronDown className="mt-1 size-4 shrink-0 text-fg-tertiary transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="flex gap-2.5 px-5 pb-5 pl-14 text-[13px] leading-relaxed text-fg-secondary">
                                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-status-amber" />
                                    {item.tip}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </ResultArea>
        </div>
    );
}
