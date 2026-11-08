"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button, Field, FilterChip, Input, Textarea } from "@/frontend/components/ui";
import { SAMPLE_COVER_LETTER } from "@/frontend/lib/mocks/dashboard";

import { ResultArea, ResultSection, ResultSheet, RunButton, ToolInput, useSimulatedRun } from "./shared";

const TONES = ["Professional", "Warm", "Confident", "Concise"] as const;

/** Job description + company + tone → an editable first draft. */
export function CoverLetterTool() {
    const [company, setCompany] = useState("");
    const [description, setDescription] = useState("");
    const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
    const [letter, setLetter] = useState(SAMPLE_COVER_LETTER);
    const [copied, setCopied] = useState(false);
    const { status, run } = useSimulatedRun();

    async function copy() {
        try {
            await navigator.clipboard.writeText(letter);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — the text is still selectable */
        }
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            <ToolInput>
                <Field label="Company">
                    <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Talabat" />
                </Field>
                <Field label="Job description">
                    <Textarea
                        rows={8}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Paste the posting here"
                    />
                </Field>
                <div>
                    <p className="mb-2 text-sm font-medium text-fg-secondary">Tone</p>
                    <div className="flex flex-wrap gap-2">
                        {TONES.map((option) => (
                            <FilterChip key={option} selected={tone === option} onClick={() => setTone(option)}>
                                {option}
                            </FilterChip>
                        ))}
                    </div>
                </div>
                <RunButton status={status} onClick={run}>
                    Write the letter
                </RunButton>
            </ToolInput>

            <ResultArea status={status} emptyTitle="No draft yet" emptyHint="Add the role and run it to get a first draft you can edit.">
                <ResultSheet>
                    <ResultSection>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-[15px] font-semibold text-fg-primary">Draft, {tone.toLowerCase()} tone</h3>
                            <Button variant="secondary" size="sm" onClick={copy}>
                                {copied ? <Check /> : <Copy />}
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </div>
                        <Textarea
                            rows={18}
                            value={letter}
                            onChange={(event) => setLetter(event.target.value)}
                            aria-label="Cover letter draft"
                            className="leading-7"
                        />
                    </ResultSection>
                </ResultSheet>
            </ResultArea>
        </div>
    );
}
