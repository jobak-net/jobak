"use client";

import { useId } from "react";
import { ScanSearch } from "lucide-react";

import { Button, Field, FilterChip, Input, Textarea } from "@/frontend/shared/ui";
import { CV_REVIEW_LIMITS as L } from "@/shared/contracts/cv-review";

import type { useCvReview } from "../hooks/use-cv-review";
import { SavedCvPicker } from "../../shared/components/saved-cv-picker";
import { ToolInput } from "../../shared/components/tool-parts";
import { CvFileInput } from "./cv-file-input";

/** The input column: the CV (a saved one, a file read in the browser, or pasted text) and the role it's aimed at. */
export function CvReviewForm({ tool }: { tool: ReturnType<typeof useCvReview> }) {
    const id = useId();
    const showText = tool.mode === "text" || tool.file !== null || (tool.mode === "saved" && tool.selectedId !== null);

    return (
        <ToolInput>
            <div>
                <h2 className="text-[15px] font-semibold text-fg-primary">Your CV</h2>
                <p className="mt-0.5 text-[13px] text-fg-tertiary">Scored the way recruiters and ATS software read it.</p>
            </div>

            <div role="group" aria-label="How to add your CV" className="flex flex-wrap gap-2">
                {tool.savedCvs.length > 0 && (
                    <FilterChip selected={tool.mode === "saved"} onClick={() => tool.switchMode("saved")}>
                        Saved
                    </FilterChip>
                )}
                <FilterChip selected={tool.mode === "file"} onClick={() => tool.switchMode("file")}>
                    Upload
                </FilterChip>
                <FilterChip selected={tool.mode === "text"} onClick={() => tool.switchMode("text")}>
                    Paste
                </FilterChip>
            </div>

            {tool.mode === "saved" && (
                <SavedCvPicker
                    cvs={tool.savedCvs}
                    selectedId={tool.selectedId}
                    onSelect={tool.selectSaved}
                    onRemove={tool.removeSaved}
                    error={tool.savedError}
                />
            )}

            {tool.mode === "file" && (
                <CvFileInput file={tool.file} reading={tool.reading} error={tool.fileError} onFile={tool.chooseFile} />
            )}

            {showText && (
                <Field
                    label={tool.mode === "text" ? "Your CV as text" : "What the AI will read"}
                    htmlFor={`${id}-cv`}
                    hint={
                        tool.tooLong
                            ? `Too long: ${tool.length.toLocaleString()} of ${L.cvMax.toLocaleString()} characters. Keep it to ${L.maxPages} pages.`
                            : tool.mode === "file"
                              ? "The text read from your file, which is also what an ATS sees. Fix anything that came out wrong."
                              : tool.mode === "saved"
                                ? "Your saved CV. Edits here are saved as a new copy when you review it."
                                : `Paste the whole CV, up to ${L.maxPages} pages. It's saved for next time.`
                    }
                >
                    <Textarea
                        id={`${id}-cv`}
                        rows={tool.mode === "text" ? 14 : 10}
                        value={tool.text}
                        onChange={(event) => tool.setText(event.target.value)}
                        placeholder="Paste your CV here: summary, experience, skills, education…"
                        aria-invalid={tool.tooLong}
                        className="font-mono text-[12.5px] leading-relaxed"
                    />
                </Field>
            )}

            <Field label="Target role" hint="From your preferences. Leave it empty to judge the CV on its own direction." htmlFor={`${id}-role`}>
                <Input
                    id={`${id}-role`}
                    value={tool.targetRole}
                    onChange={(event) => tool.setTargetRole(event.target.value)}
                    maxLength={L.targetRole}
                    placeholder="Frontend Engineer"
                />
            </Field>

            <div>
                <Button variant="primary" className="w-full" onClick={tool.openPicker} disabled={!tool.canReview}>
                    <ScanSearch /> Review my CV
                </Button>
                <p aria-live="polite" className="mt-2 min-h-5 text-[13px]">
                    {tool.error ? (
                        <span role="alert" className="text-status-rose">
                            {tool.error}
                        </span>
                    ) : tool.reading ? null : tool.tooShort ? (
                        <span className="text-fg-tertiary">
                            {tool.mode === "file" ? "Choose your CV file to review it." : "Paste your CV to review it."}
                        </span>
                    ) : null}
                </p>
            </div>
        </ToolInput>
    );
}
