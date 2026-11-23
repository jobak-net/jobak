"use client";

import { useMemo, useState } from "react";
import { Check, CircleAlert, Copy, FileDown, FileText, Loader2, PenLine, Sparkles } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { Button, Chip, Textarea } from "@/frontend/shared/ui";
import { findAiModel } from "@/shared/ai";
import { findAiTells, structuralTells, unsupportedDurations } from "@/shared/ai-tools";
import type { CoverLetterResponse } from "@/shared/contracts/cover-letter";

import { useDocumentExport } from "../../shared/hooks/use-document-export";
import { documentTitle } from "../../shared/lib/export-document";
import { ResultSection, ResultSheet } from "../../shared/components/tool-parts";
import { BeforeYouSend } from "./before-you-send";
import { PostingCheck } from "../../shared/components/posting-check";

/**
 * The draft, editable in place, with what it was built from: who wrote it,
 * the skills it was matched on, and anything the posting hid for AI tools.
 * Copy, or save as PDF or Word — made in the browser (`useDocumentExport`).
 * Phrasing that reads as machine-written is re-checked as the user edits.
 */
export function CoverLetterResult({
    result,
    letter,
    onLetterChange,
    meta,
    facts,
}: {
    result: CoverLetterResponse;
    letter: string;
    onLetterChange: (letter: string) => void;
    /** For the file names: the name and company from the form. */
    meta: { name: string; company: string };
    /** What the user wrote under "What you've done": a duration the letter claims beyond it is flagged. */
    facts: string;
}) {
    const [copied, setCopied] = useState(false);
    const model = findAiModel(result.provider, result.model)?.label ?? result.model;
    const files = useDocumentExport(letter, { title: documentTitle("Cover letter", meta.company, meta.name), author: meta.name });
    // Live: rewording a flagged phrase, or varying the sentences, removes it from the list.
    const styleFlags = useMemo(
        () => [
            // Phrases are quoted as written; the label-style ones ("em dash (—)") read fine quoted too.
            ...findAiTells(letter).map((phrase) => (phrase.startsWith("“") ? phrase : `“${phrase}”`)),
            // Rhythm notes are sentences of their own: left unquoted.
            ...structuralTells(letter),
            ...unsupportedDurations(letter, facts).map((d) => `“${d}”: not something you said`),
        ],
        [letter, facts],
    );

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
        <ResultSheet>
            {result.plantedWordsInLetter.length > 0 && (
                <ResultSection>
                    <p role="alert" className="flex items-start gap-2 text-[13px] leading-relaxed text-status-rose">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>
                            The draft contains {result.plantedWordsInLetter.map((w) => `“${w}”`).join(", ")}, which the
                            posting planted (see the posting check below). Remove it unless you&apos;re sure it&apos;s a
                            genuine request.
                        </span>
                    </p>
                </ResultSection>
            )}

            <ResultSection>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">Your draft</h3>
                        <p className="mt-0.5 text-[13px] text-fg-tertiary">
                            Written by {PROVIDER_INFO[result.provider].name}, {model}. Edit it before you send it.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={copy}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={files.savePdf}
                            disabled={files.working !== null}
                            title={files.pdfViaPrint ? "Opens your browser's print dialog: choose Save as PDF" : undefined}
                        >
                            {files.working === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />}
                            PDF
                        </Button>
                        <Button variant="secondary" size="sm" onClick={files.saveDocx} disabled={files.working !== null}>
                            {files.working === "docx" ? <Loader2 className="animate-spin" /> : <FileText />}
                            Word
                        </Button>
                    </div>
                </div>
                <BeforeYouSend />
                <Textarea
                    rows={20}
                    value={letter}
                    onChange={(event) => onLetterChange(event.target.value)}
                    aria-label="Cover letter draft"
                    className="leading-7"
                />
                <div aria-live="polite" className="mt-3 space-y-2 text-[13px] leading-relaxed">
                    {files.error && (
                        <p role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {files.error}
                        </p>
                    )}
                    {files.pdfViaPrint && (
                        <p className="text-fg-tertiary">
                            PDF opens your browser&apos;s print dialog (choose Save as PDF) so every script prints correctly.
                        </p>
                    )}
                    {styleFlags.length > 0 ? (
                        <div className="rounded-control border border-status-amber/30 bg-status-amber/6 p-3">
                            <p className="flex items-center gap-2 font-medium text-fg-secondary">
                                <PenLine className="size-3.5 shrink-0 text-status-amber" />
                                Reword these in your own words
                            </p>
                            <p className="mt-1 text-fg-tertiary">
                                What often reads as AI-written:{" "}
                                {styleFlags.join("; ")}.
                            </p>
                        </div>
                    ) : (
                        <p className="text-fg-tertiary">
                            No stock AI phrasing found. Detectors aren&apos;t reliable either way; a few edits in your
                            own words make it yours.
                        </p>
                    )}
                </div>
            </ResultSection>

            <ResultSection title="Built around your skills">
                {result.matchedSkills.length > 0 ? (
                    <>
                        <p className="mb-3 text-[13px] text-fg-tertiary">The skills from your preferences that this posting asks for.</p>
                        <div className="flex flex-wrap gap-1.5">
                            {result.matchedSkills.map((skill) => (
                                <Chip key={skill} dot="var(--score-high)">
                                    {skill}
                                </Chip>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="flex items-start gap-2 text-[13px] leading-relaxed text-fg-tertiary">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                        None of the skills in your preferences appear in this posting, so the letter leans on your target role.
                        Adding skills in Preferences makes the next one more specific.
                    </p>
                )}
            </ResultSection>

            {result.postingFindings.length > 0 && (
                <ResultSection>
                    <PostingCheck findings={result.postingFindings} />
                </ResultSection>
            )}
        </ResultSheet>
    );
}
