"use client";

import { useMemo, useState } from "react";
import { Check, CircleAlert, Copy, FileDown, FileText, Loader2, PenLine } from "lucide-react";

import { Button, FilterChip, Textarea } from "@/frontend/shared/ui";
import { findAiTells, plantedWordsIn, unsupportedNumbers } from "@/shared/ai-tools";

import { useDocumentExport } from "../hooks/use-document-export";
import { cvDocumentHtml, parseCv } from "../lib/cv-layout";
import type { DocumentMeta } from "../lib/export-document";
import { ResultSection } from "./tool-parts";

/**
 * A CV the AI rewrote (improved, tailored), editable in place, with a preview
 * of how it looks as a file, to copy or save as Word or PDF (made in the
 * browser, in the ATS-friendly design of `export-cv.ts`). As the user edits, it re-checks
 * what the CV claims beyond the original (numbers it never states), wording
 * that reads as generated, and, for a tailored CV, words the job posting
 * planted for AI tools.
 */
export function CvEditor({
    title,
    text,
    onTextChange,
    original,
    file,
    plantedWords = [],
}: {
    title: string;
    text: string;
    onTextChange: (text: string) => void;
    /** The CV it was written from: a number not in it is flagged. */
    original: string;
    /** The file name (without extension) and author, for PDF and Word. */
    file: DocumentMeta;
    /** Words a job posting planted for AI tools (`scanJobPosting`): flagged if they appear. */
    plantedWords?: string[];
}) {
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState<"edit" | "preview">("edit");
    const files = useDocumentExport(text, file, "cv");
    // The preview is the same HTML the print path uses: what you see is the file's design.
    const preview = useMemo(
        () => (view === "preview" ? cvDocumentHtml(parseCv(text), { title: file.title, print: false }) : ""),
        [view, text, file.title],
    );
    const numbers = useMemo(() => unsupportedNumbers(text, original), [text, original]);
    const tells = useMemo(() => findAiTells(text).filter((t) => !t.includes("(")), [text]);
    const planted = useMemo(() => plantedWordsIn(text, plantedWords), [text, plantedWords]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — the text is still selectable */
        }
    }

    return (
        <ResultSection>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg-primary">{title}</h3>
                    <p className="mt-0.5 text-[13px] text-fg-tertiary">
                        Plain text that ATS software reads cleanly. Check every line is true before you use it.
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
            <div role="group" aria-label="Edit or preview" className="mb-3 flex gap-2">
                <FilterChip selected={view === "edit"} onClick={() => setView("edit")}>
                    Edit
                </FilterChip>
                <FilterChip selected={view === "preview"} onClick={() => setView("preview")}>
                    Preview
                </FilterChip>
            </div>
            {view === "edit" ? (
                <Textarea
                    rows={24}
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    aria-label={title}
                    className="font-mono text-[12.5px] leading-relaxed"
                />
            ) : (
                <iframe
                    title={`${title}: preview`}
                    srcDoc={preview}
                    sandbox=""
                    className="h-[720px] w-full rounded-control border border-border-standard bg-[#e4e4e7]"
                />
            )}
            <div aria-live="polite" className="mt-3 space-y-2 text-[13px] leading-relaxed">
                {files.error && (
                    <p role="alert" className="flex items-start gap-2 text-status-rose">
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {files.error}
                    </p>
                )}
                {planted.length > 0 && (
                    <p role="alert" className="flex items-start gap-2 text-status-rose">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>
                            {planted.map((w) => `“${w}”`).join(", ")}: the posting planted {planted.length === 1 ? "this" : "these"} for AI
                            tools. Remove {planted.length === 1 ? "it" : "them"} unless you&apos;re sure it&apos;s a genuine request.
                        </span>
                    </p>
                )}
                {numbers.length > 0 && (
                    <p role="alert" className="flex items-start gap-2 text-status-rose">
                        <CircleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>
                            {numbers.map((n) => `“${n}”`).join(", ")} {numbers.length === 1 ? "isn't" : "aren't"} in your original CV.
                            Keep {numbers.length === 1 ? "it" : "them"} only if {numbers.length === 1 ? "it's" : "they're"} true.
                        </span>
                    </p>
                )}
                {tells.length > 0 && (
                    <div className="rounded-control border border-status-amber/30 bg-status-amber/6 p-3">
                        <p className="flex items-center gap-2 font-medium text-fg-secondary">
                            <PenLine className="size-3.5 shrink-0 text-status-amber" />
                            Reword these in your own words
                        </p>
                        <p className="mt-1 text-fg-tertiary">What often reads as AI-written: {tells.map((t) => `“${t}”`).join(", ")}.</p>
                    </div>
                )}
            </div>
        </ResultSection>
    );
}
