"use client";

import { useState } from "react";
import { Check, CircleAlert, Download, Loader2 } from "lucide-react";

import { Button, ScoreRing } from "@/frontend/shared/ui";

import type { InterviewEvaluation } from "../lib/evaluation";

/**
 * The interviewer's evaluation after the call: the score, a summary, what
 * went well, and each mistake with a better answer. "Download PDF" saves it
 * with the transcript (`onDownload`, built in the browser).
 */
export function EvaluationView({ evaluation, onDownload }: { evaluation: InterviewEvaluation; onDownload: () => Promise<void> }) {
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);

    async function download() {
        setSaving(true);
        setFailed(false);
        try {
            await onDownload();
        } catch {
            setFailed(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section aria-labelledby="evaluation-title" className="space-y-6">
            <div className="flex flex-wrap items-start gap-4">
                {evaluation.score !== null && <ScoreRing score={evaluation.score * 10} label={String(evaluation.score)} size={56} stroke={4} />}
                <div className="min-w-0 flex-1">
                    <h2 id="evaluation-title" className="text-[17px] font-semibold tracking-[-0.02em] text-fg-primary">
                        Your feedback
                        {evaluation.score !== null && <span className="ml-2 text-sm font-normal text-fg-tertiary">{evaluation.score} out of 10</span>}
                    </h2>
                    {evaluation.summary && <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{evaluation.summary}</p>}
                </div>
                <Button variant="primary" size="sm" onClick={download} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Download />} Download PDF
                </Button>
            </div>
            {failed && (
                <p role="alert" className="flex items-center gap-1.5 text-[13px] text-status-amber">
                    <CircleAlert className="size-3.5" /> The PDF couldn&apos;t be made. Try again.
                </p>
            )}

            {evaluation.strengths.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-fg-primary">What went well</h3>
                    <ul className="mt-2 space-y-1.5">
                        {evaluation.strengths.map((strength) => (
                            <li key={strength} className="flex gap-2 text-[13px] leading-relaxed text-fg-secondary">
                                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                                {strength}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {evaluation.mistakes.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-fg-primary">
                        Mistakes to fix <span className="font-normal text-fg-tertiary">({evaluation.mistakes.length})</span>
                    </h3>
                    <ol className="mt-2.5 space-y-3">
                        {evaluation.mistakes.map((mistake, i) => (
                            <li key={i} className="rounded-card border border-border-subtle bg-white/2 p-4 text-[13px] leading-relaxed">
                                {mistake.said && <p className="italic text-fg-primary">&ldquo;{mistake.said}&rdquo;</p>}
                                {mistake.why && (
                                    <p className={mistake.said ? "mt-2 text-fg-secondary" : "text-fg-secondary"}>
                                        <span className="font-medium text-status-amber">Why it hurts: </span>
                                        {mistake.why}
                                    </p>
                                )}
                                {mistake.better && (
                                    <p className="mt-2 text-fg-secondary">
                                        <span className="font-medium text-accent-text">A better answer: </span>
                                        {mistake.better}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </section>
    );
}
