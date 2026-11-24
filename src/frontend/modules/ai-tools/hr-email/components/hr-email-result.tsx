"use client";

import { useState } from "react";
import { Check, CircleAlert, Copy, Info, Mail, PenLine } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { Button, Field, Input, Textarea } from "@/frontend/shared/ui";
import { findAiModel } from "@/shared/ai";
import { plantedWordsIn } from "@/shared/ai-tools";
import type { HrEmailResponse } from "@/shared/contracts/hr-email";

import { ResultSection, ResultSheet } from "../../shared/components/tool-parts";

/** A `mailto:` link: the user's own email app opens with it, nothing is sent from here. */
function mailtoHref(to: string, subject: string, body: string): string {
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * The email, editable in place: subject and body, to copy or open in the
 * user's email app (a `mailto:` link: Jobak never sends it). Then what to
 * check or add before sending, and phrasing that reads as generated,
 * re-checked as the user edits.
 */
export function HrEmailResult({
    result,
    subject,
    onSubjectChange,
    body,
    onBodyChange,
    styleFlags,
    recipientEmail,
    plantedWords,
}: {
    result: HrEmailResponse;
    subject: string;
    onSubjectChange: (value: string) => void;
    body: string;
    onBodyChange: (value: string) => void;
    /** Live: what reads as generated in the edited email. */
    styleFlags: string[];
    /** The address the user gave, for "Open in email app"; empty for none. */
    recipientEmail: string;
    /** Words the posting or their message planted for AI tools. */
    plantedWords: string[];
}) {
    const [copied, setCopied] = useState<"all" | "body" | null>(null);
    const model = findAiModel(result.provider, result.model)?.label ?? result.model;
    const planted = plantedWordsIn(`${subject}\n${body}`, plantedWords);

    async function copy(what: "all" | "body") {
        try {
            await navigator.clipboard.writeText(what === "all" ? `Subject: ${subject}\n\n${body}` : body);
            setCopied(what);
            window.setTimeout(() => setCopied(null), 1500);
        } catch {
            /* clipboard blocked — the text is still selectable */
        }
    }

    return (
        <ResultSheet>
            <ResultSection>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">Your email</h3>
                        <p className="mt-0.5 text-[13px] text-fg-tertiary">
                            Written by {PROVIDER_INFO[result.provider].name}, {model}. Edit it before you send it.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => copy("all")}>
                            {copied === "all" ? <Check /> : <Copy />}
                            {copied === "all" ? "Copied" : "Copy all"}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => copy("body")}>
                            {copied === "body" ? <Check /> : <Copy />}
                            {copied === "body" ? "Copied" : "Copy body"}
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                            <a href={mailtoHref(recipientEmail, subject, body)}>
                                <Mail /> Open in email app
                            </a>
                        </Button>
                    </div>
                </div>

                <Field label="Subject" htmlFor="hr-email-subject">
                    <Input id="hr-email-subject" value={subject} onChange={(event) => onSubjectChange(event.target.value)} />
                </Field>
                <Textarea
                    rows={14}
                    value={body}
                    onChange={(event) => onBodyChange(event.target.value)}
                    aria-label="Email"
                    className="mt-3 leading-7"
                />

                <div aria-live="polite" className="mt-3 space-y-2 text-[13px] leading-relaxed">
                    {result.unsupportedSkills.length > 0 && (
                        <p role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" />
                            <span>
                                {result.unsupportedSkills.map((s) => `“${s}”`).join(", ")}{" "}
                                {result.unsupportedSkills.length === 1 ? "isn't" : "aren't"} in your CV or notes. Remove{" "}
                                {result.unsupportedSkills.length === 1 ? "it" : "them"} unless you really have that experience.
                            </span>
                        </p>
                    )}
                    {planted.length > 0 && (
                        <p role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" />
                            <span>
                                {planted.map((w) => `“${w}”`).join(", ")}: planted for AI tools in what you pasted. Remove{" "}
                                {planted.length === 1 ? "it" : "them"} unless you&apos;re sure it&apos;s a genuine request.
                            </span>
                        </p>
                    )}
                    {styleFlags.length > 0 && (
                        <div className="rounded-control border border-status-amber/30 bg-status-amber/6 p-3">
                            <p className="flex items-center gap-2 font-medium text-fg-secondary">
                                <PenLine className="size-3.5 shrink-0 text-status-amber" />
                                Reword these in your own words
                            </p>
                            <p className="mt-1 text-fg-tertiary">
                                What often reads as AI-written: {styleFlags.map((f) => (f.startsWith("“") ? f : `“${f}”`)).join(", ")}.
                            </p>
                        </div>
                    )}
                </div>
            </ResultSection>

            <ResultSection title="Before you send it">
                {result.notes.length > 0 ? (
                    <ul className="space-y-2">
                        {result.notes.map((note) => (
                            <li key={note} className="flex gap-2.5 text-[13px] leading-relaxed text-fg-secondary">
                                <Info className="mt-0.5 size-4 shrink-0 text-fg-tertiary" />
                                {note}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[13px] text-fg-tertiary">Nothing to add. Read it once and make sure every line is true.</p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                    Attach your CV yourself when the email says it&apos;s attached. Jobak never sends emails for you.
                </p>
            </ResultSection>
        </ResultSheet>
    );
}
