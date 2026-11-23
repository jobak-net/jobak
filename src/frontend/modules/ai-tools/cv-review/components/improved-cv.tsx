"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, CircleAlert, Copy, FileDown, FileText, Loader2, PenLine, Sparkles } from "lucide-react";

import { PROVIDER_INFO } from "@/frontend/modules/onboarding";
import { Button, Textarea, scoreColor } from "@/frontend/shared/ui";
import { findAiTells, unsupportedNumbers } from "@/shared/ai-tools";
import type { CvImproveResponse, CvReviewResponse } from "@/shared/contracts/cv-review";

import { useDocumentExport } from "../../shared/hooks/use-document-export";
import { documentTitle } from "../../shared/lib/export-document";
import { ResultSection } from "../../shared/components/tool-parts";

/**
 * The improved CV: asked for after the review (the CV review skill never
 * rewrites first), on the same provider. Then the scores side by side, what
 * changed, what only the user can add, and the CV itself, editable, to copy
 * or save as Word or PDF (made in the browser). What it claims beyond the
 * original is re-checked as the user edits.
 */
export function ImprovedCv({
    review,
    original,
    improved,
    text,
    onTextChange,
    improving,
    error,
    onImprove,
    name,
}: {
    review: CvReviewResponse;
    /** The CV text the review was made on. */
    original: string;
    improved: CvImproveResponse | null;
    text: string;
    onTextChange: (text: string) => void;
    improving: boolean;
    error: string | null;
    onImprove: () => void;
    /** The account's name, for the file name. */
    name: string;
}) {
    // Nothing on the scorecard left to gain: a rewrite could only lose points, so it isn't offered.
    const nothingToFix = review.score >= 100 || review.issues.length === 0;
    if (!improved && nothingToFix) {
        return (
            <ResultSection>
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg-primary">
                    <CheckCircle2 className="size-4 text-score-high" /> Nothing to improve
                </h3>
                <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-fg-tertiary">
                    {review.score >= 100
                        ? "Your CV scored 100 on this scorecard, so a rewrite could only make it worse. Keep it as it is."
                        : "The review found nothing to fix, so there's nothing to rewrite. Keep it as it is."}
                </p>
            </ResultSection>
        );
    }

    if (!improved) {
        return (
            <ResultSection>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">The improved CV</h3>
                        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-fg-tertiary">
                            {PROVIDER_INFO[review.provider].name} rewrites it to fix what&apos;s above, in plain professional language,
                            without adding anything your CV doesn&apos;t say. What only you can add, it asks for.
                        </p>
                    </div>
                    <Button variant="primary" onClick={onImprove} disabled={improving} className="shrink-0">
                        {improving ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        {improving ? "Writing…" : "Write the improved CV"}
                    </Button>
                </div>
                <p aria-live="polite" className="mt-3 text-[13px] leading-relaxed">
                    {error ? (
                        <span role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                        </span>
                    ) : improving ? (
                        <span className="text-fg-tertiary">This takes up to a minute.</span>
                    ) : review.score >= 90 ? (
                        <span className="text-fg-tertiary">
                            Your CV already scores {review.score}. A rewrite changes only what the review flagged, and may not
                            raise the score.
                        </span>
                    ) : (
                        <span className="text-fg-quaternary">
                            On a free tier, your provider may need a minute between the review and this.
                        </span>
                    )}
                </p>
            </ResultSection>
        );
    }

    return <ImprovedResult review={review} original={original} improved={improved} text={text} onTextChange={onTextChange} name={name} />;
}

function ImprovedResult({
    review,
    original,
    improved,
    text,
    onTextChange,
    name,
}: {
    review: CvReviewResponse;
    original: string;
    improved: CvImproveResponse;
    text: string;
    onTextChange: (text: string) => void;
    name: string;
}) {
    const [copied, setCopied] = useState(false);
    const files = useDocumentExport(text, { title: documentTitle("CV", name, review.targetRole), author: name });
    // Live: what the edited CV claims beyond the original, and wording that reads as generated.
    const numbers = useMemo(() => unsupportedNumbers(text, original), [text, original]);
    const tells = useMemo(() => findAiTells(text).filter((t) => !t.includes("(")), [text]);
    const before = new Map(review.categories.map((c) => [c.id, c.score]));
    // A rewrite that scores lower isn't an improvement: said plainly, with where the original is stronger.
    const weaker = improved.categories.filter((c) => c.score < (before.get(c.id) ?? 0));
    const worse = improved.score < review.score;

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
        <>
            <ResultSection title="Before and after">
                <div className="mb-4 flex items-center gap-3 text-sm">
                    <span className="tabular-nums font-semibold" style={{ color: scoreColor(review.score) }}>
                        {review.score}
                    </span>
                    <ArrowRight className="size-4 text-fg-quaternary" aria-label="to" />
                    <span className="tabular-nums font-semibold" style={{ color: scoreColor(improved.score) }}>
                        {improved.score}
                    </span>
                    <span className="text-fg-tertiary">out of 100, re-scored on the same scorecard</span>
                </div>
                {(worse || weaker.length > 0) && (
                    <p role="alert" className="mb-4 flex items-start gap-2 rounded-control border border-status-rose/30 bg-status-rose/6 p-3 text-[13px] leading-relaxed text-fg-secondary">
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-status-rose" />
                        <span>
                            {worse
                                ? `The rewrite scored lower than your original (${improved.score} against ${review.score}), so it isn't an improvement. `
                                : "The rewrite is stronger overall, but weaker in places. "}
                            Your original is better in {weaker.map((c) => c.label.toLowerCase()).join(", ") || "places"}:{" "}
                            {worse ? "keep your original CV" : "keep your original wording there"}, and take only the changes you like.
                        </span>
                    </p>
                )}
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="text-left text-xs text-fg-quaternary">
                            <th className="pb-2 font-medium">Category</th>
                            <th className="pb-2 text-right font-medium">Before</th>
                            <th className="pb-2 text-right font-medium">After</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {improved.categories.map((c) => (
                            <tr key={c.id}>
                                <td className="py-1.5 text-fg-secondary">{c.label}</td>
                                <td className="py-1.5 text-right tabular-nums text-fg-tertiary">
                                    {before.get(c.id) ?? "?"}/{c.max}
                                </td>
                                <td
                                    className={`py-1.5 text-right tabular-nums ${c.score < (before.get(c.id) ?? 0) ? "text-status-rose" : "text-fg-primary"}`}
                                >
                                    {c.score}/{c.max}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ResultSection>

            <div className="grid divide-y divide-border-subtle lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                <ResultSection title="What changed">
                    <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                        {improved.changes.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </ResultSection>
                <ResultSection title="Only you can add">
                    {improved.stillNeeded.length > 0 ? (
                        <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-fg-secondary marker:text-fg-quaternary">
                            {improved.stillNeeded.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-fg-tertiary">Nothing it needed to ask.</p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-fg-quaternary">
                        Real numbers and details make the biggest difference. Add them yourself below; nothing was made up for you.
                    </p>
                </ResultSection>
            </div>

            <ResultSection>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[15px] font-semibold text-fg-primary">Your improved CV</h3>
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
                <Textarea
                    rows={24}
                    value={text}
                    onChange={(event) => onTextChange(event.target.value)}
                    aria-label="Improved CV"
                    className="font-mono text-[12.5px] leading-relaxed"
                />
                <div aria-live="polite" className="mt-3 space-y-2 text-[13px] leading-relaxed">
                    {files.error && (
                        <p role="alert" className="flex items-start gap-2 text-status-rose">
                            <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {files.error}
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
        </>
    );
}
