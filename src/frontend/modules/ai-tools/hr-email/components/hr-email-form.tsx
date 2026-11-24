"use client";

import { useId } from "react";
import { Mail } from "lucide-react";

import { Button, Field, FilterChip, Input, Textarea, inputClass } from "@/frontend/shared/ui";
import { HR_EMAIL_LIMITS as L, HR_EMAIL_PURPOSES, HR_EMAIL_TONES } from "@/shared/contracts/hr-email";

import type { useHrEmail } from "../hooks/use-hr-email";
import { PURPOSES, TONE_LABEL } from "../lib/purposes";
import { PostingCheck } from "../../shared/components/posting-check";
import { ToolInput } from "../../shared/components/tool-parts";

const tooLongHint = (length: number, max: number) => `Too long: ${length.toLocaleString()} of ${max.toLocaleString()} characters`;

/** The input column: what the email is for, then only the fields that purpose needs. */
export function HrEmailForm({ tool }: { tool: ReturnType<typeof useHrEmail> }) {
    const id = useId();
    const { fields, set, config } = tool;

    return (
        <ToolInput>
            <Field label="What's the email for?" htmlFor={`${id}-purpose`}>
                <select
                    id={`${id}-purpose`}
                    value={tool.purpose}
                    onChange={(event) => tool.setPurpose(event.target.value as typeof tool.purpose)}
                    className={inputClass}
                >
                    {HR_EMAIL_PURPOSES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                            {PURPOSES[purpose].label}
                        </option>
                    ))}
                </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <Field label="Your name" hint="Saved for next time" htmlFor={`${id}-name`} controlAtBottom>
                    <Input
                        id={`${id}-name`}
                        value={fields.name}
                        onChange={(event) => set("name", event.target.value)}
                        maxLength={L.name}
                        autoComplete="name"
                    />
                </Field>
                <Field label="To (optional)" hint="Their name, if you know it" htmlFor={`${id}-to`} controlAtBottom>
                    <Input
                        id={`${id}-to`}
                        value={fields.recipientName}
                        onChange={(event) => set("recipientName", event.target.value)}
                        maxLength={L.name}
                        placeholder="Mariam Hassan"
                    />
                </Field>
            </div>

            <Field label="Their email (optional)" hint="Only to open the email in your mail app. Never sent anywhere." htmlFor={`${id}-email`}>
                <Input
                    id={`${id}-email`}
                    type="email"
                    value={fields.recipientEmail}
                    onChange={(event) => set("recipientEmail", event.target.value)}
                    maxLength={L.email}
                    placeholder="careers@company.com"
                    autoComplete="off"
                />
            </Field>

            {config.fields.job && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <Field label="Company" htmlFor={`${id}-company`}>
                        <Input
                            id={`${id}-company`}
                            value={fields.company}
                            onChange={(event) => set("company", event.target.value)}
                            maxLength={L.company}
                            placeholder="Khazna"
                        />
                    </Field>
                    <Field label="Position" htmlFor={`${id}-title`}>
                        <Input
                            id={`${id}-title`}
                            value={fields.title}
                            onChange={(event) => set("title", event.target.value)}
                            maxLength={L.jobTitle}
                            placeholder="Back End Developer"
                        />
                    </Field>
                </div>
            )}

            {config.fields.posting && (
                <Field
                    label="Job posting (optional)"
                    htmlFor={`${id}-posting`}
                    hint={fields.posting.length > L.posting ? tooLongHint(fields.posting.length, L.posting) : "Makes the email specific to the role."}
                >
                    <Textarea
                        id={`${id}-posting`}
                        rows={5}
                        value={fields.posting}
                        onChange={(event) => set("posting", event.target.value)}
                        placeholder="Paste the job posting"
                        aria-invalid={fields.posting.length > L.posting}
                    />
                </Field>
            )}

            {config.fields.theirMessage && (
                <Field
                    label={config.requires === "theirMessage" ? "Their message" : "Their message (optional)"}
                    htmlFor={`${id}-message`}
                    hint={
                        fields.theirMessage.length > L.theirMessage
                            ? tooLongHint(fields.theirMessage.length, L.theirMessage)
                            : "What HR or the recruiter wrote to you."
                    }
                >
                    <Textarea
                        id={`${id}-message`}
                        rows={5}
                        value={fields.theirMessage}
                        onChange={(event) => set("theirMessage", event.target.value)}
                        placeholder="Paste their email"
                        aria-invalid={fields.theirMessage.length > L.theirMessage}
                    />
                </Field>
            )}

            {(config.fields.posting || config.fields.theirMessage) && <PostingCheck findings={tool.scan.findings} />}

            {config.fields.draft && (
                <Field
                    label="Your draft"
                    htmlFor={`${id}-draft`}
                    hint={fields.draft.length > L.draft ? tooLongHint(fields.draft.length, L.draft) : "It keeps your meaning and every fact."}
                >
                    <Textarea
                        id={`${id}-draft`}
                        rows={8}
                        value={fields.draft}
                        onChange={(event) => set("draft", event.target.value)}
                        placeholder="Paste the email you wrote"
                        aria-invalid={fields.draft.length > L.draft}
                    />
                </Field>
            )}

            <Field
                label={config.requires === "notes" ? "What to say" : "What to say (optional)"}
                htmlFor={`${id}-notes`}
                hint={
                    fields.notes.length > L.notes
                        ? tooLongHint(fields.notes.length, L.notes)
                        : "Dates, figures and names come only from you: nothing is made up."
                }
            >
                <Textarea
                    id={`${id}-notes`}
                    rows={3}
                    value={fields.notes}
                    onChange={(event) => set("notes", event.target.value)}
                    placeholder={config.notesHint}
                    aria-invalid={fields.notes.length > L.notes}
                />
            </Field>

            {config.fields.cv && tool.savedCvs.length > 0 && (
                <Field label="Draw on" hint="Your experience comes from this CV." htmlFor={`${id}-cv`}>
                    <select
                        id={`${id}-cv`}
                        value={tool.cvId ?? ""}
                        onChange={(event) => tool.setCvId(event.target.value || null)}
                        className={inputClass}
                    >
                        {tool.savedCvs.map((cv) => (
                            <option key={cv.id} value={cv.id}>
                                {cv.label}
                            </option>
                        ))}
                        <option value="">My profile&apos;s skills only</option>
                    </select>
                </Field>
            )}

            <div>
                <p className="mb-2 text-sm font-medium text-fg-secondary">Tone</p>
                <div className="flex flex-wrap gap-2">
                    {HR_EMAIL_TONES.map((tone) => (
                        <FilterChip
                            key={tone}
                            selected={tool.tone === tone}
                            onClick={() => tool.setTone(tone)}
                            className="normal-case"
                        >
                            {TONE_LABEL[tone]}
                        </FilterChip>
                    ))}
                </div>
            </div>

            <div>
                <Button variant="primary" className="w-full" onClick={tool.openPicker} disabled={!tool.canWrite}>
                    <Mail /> Write the email
                </Button>
                <p aria-live="polite" className="mt-2 min-h-5 text-[13px]">
                    {tool.error ? (
                        <span role="alert" className="text-status-rose">
                            {tool.error}
                        </span>
                    ) : tool.missing.length > 0 ? (
                        <span className="text-fg-tertiary">Add {tool.missing[0]} to write it.</span>
                    ) : null}
                </p>
            </div>
        </ToolInput>
    );
}
