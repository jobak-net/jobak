"use client";

import { useId } from "react";
import { PenLine } from "lucide-react";

import { Button, Field, FilterChip, Input, Textarea, inputClass } from "@/frontend/shared/ui";
import { COVER_LETTER_LIMITS as L, COVER_LETTER_TONES } from "@/shared/contracts/cover-letter";

import type { useCoverLetter } from "../hooks/use-cover-letter";
import { TONE_LABEL } from "../lib/tones";
import { ToolInput } from "../../shared/components/tool-parts";
import { PostingCheck } from "../../shared/components/posting-check";

/** The input column: who's applying, what they've done, for what job, and in which tone. */
export function CoverLetterForm({ tool }: { tool: ReturnType<typeof useCoverLetter> }) {
    const { fields, set } = tool;
    const id = useId();

    return (
        <ToolInput>
            <Field label="Your name" hint="Kept for next time when you change it" htmlFor={`${id}-name`}>
                <Input
                    id={`${id}-name`}
                    value={fields.name}
                    onChange={(event) => set("name", event.target.value)}
                    maxLength={L.name}
                    autoComplete="name"
                />
            </Field>

            {tool.savedCvs.length > 0 && (
                <Field label="Start from" hint="One of your saved CVs fills the box below. Edit it freely." htmlFor={`${id}-saved-cv`}>
                    <select
                        id={`${id}-saved-cv`}
                        value={tool.cvId ?? ""}
                        onChange={(event) => tool.pickSavedCv(event.target.value || null)}
                        className={inputClass}
                    >
                        {tool.savedCvs.map((cv) => (
                            <option key={cv.id} value={cv.id}>
                                {cv.label}
                            </option>
                        ))}
                        <option value="">Nothing: I&apos;ll write my own</option>
                    </select>
                </Field>
            )}

            <Field
                label="What you've done (optional)"
                htmlFor={`${id}-experience`}
                hint={
                    tool.experienceTooLong
                        ? `Too long: ${tool.experienceLength.toLocaleString()} of ${L.experienceMax.toLocaleString()} characters`
                        : "A few lines or your CV: what you built, for whom, what came of it. The letter is built on it and claims nothing else."
                }
            >
                <Textarea
                    id={`${id}-experience`}
                    rows={5}
                    value={fields.experience}
                    onChange={(event) => set("experience", event.target.value)}
                    placeholder="I built the checkout for a grocery app used in three cities. I moved our team from Redux to React Query…"
                    aria-invalid={tool.experienceTooLong}
                />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Company" htmlFor={`${id}-company`}>
                    <Input
                        id={`${id}-company`}
                        value={fields.company}
                        onChange={(event) => set("company", event.target.value)}
                        maxLength={L.company}
                        placeholder="Talabat"
                    />
                </Field>
                <Field label="Job title" htmlFor={`${id}-title`}>
                    <Input
                        id={`${id}-title`}
                        value={fields.title}
                        onChange={(event) => set("title", event.target.value)}
                        maxLength={L.jobTitle}
                        placeholder="Senior Frontend Engineer"
                    />
                </Field>
            </div>

            <Field
                label="Job posting"
                htmlFor={`${id}-posting`}
                hint={
                    tool.tooLong
                        ? `Too long: ${tool.descriptionLength.toLocaleString()} of ${L.descriptionMax.toLocaleString()} characters`
                        : "Paste the whole posting. It's checked for text planted for AI tools."
                }
            >
                <Textarea
                    id={`${id}-posting`}
                    rows={9}
                    value={fields.description}
                    onChange={(event) => set("description", event.target.value)}
                    placeholder="Paste the job posting here"
                    aria-invalid={tool.tooLong}
                />
            </Field>

            <PostingCheck findings={tool.scan.findings} />

            <div>
                <p className="mb-2 text-sm font-medium text-fg-secondary">Tone</p>
                <div className="flex flex-wrap gap-2">
                    {COVER_LETTER_TONES.map((tone) => (
                        <FilterChip key={tone} selected={fields.tone === tone} onClick={() => set("tone", tone)}>
                            {TONE_LABEL[tone]}
                        </FilterChip>
                    ))}
                </div>
            </div>

            <div>
                <Button variant="primary" className="w-full" onClick={tool.openPicker} disabled={!tool.canWrite}>
                    <PenLine /> Write the letter
                </Button>
                <p aria-live="polite" className="mt-2 min-h-5 text-[13px]">
                    {tool.error ? (
                        <span role="alert" className="text-status-rose">
                            {tool.error}
                        </span>
                    ) : tool.missing.length > 0 ? (
                        <span className="text-fg-tertiary">Add {tool.missing[0]} to write it.</span>
                    ) : tool.experienceLength === 0 ? (
                        <span className="text-fg-tertiary">
                            Without “What you&apos;ve done” the letter can only speak in general terms.
                        </span>
                    ) : null}
                </p>
            </div>
        </ToolInput>
    );
}
