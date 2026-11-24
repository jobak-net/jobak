"use client";

import { useId } from "react";

import { Field, FilterChip, Textarea } from "@/frontend/shared/ui";
import { CV_REVIEW_LIMITS as L } from "@/shared/contracts/cv-review";

import type { CvInputState } from "../hooks/use-cv-input";
import { CvFileInput } from "./cv-file-input";
import { SavedCvPicker } from "./saved-cv-picker";

/**
 * Where the user gives a tool their CV: Saved / Upload / Paste, then the text
 * the AI will read, editable. `action` finishes the hints ("review it",
 * "tailor it").
 */
export function CvInput({ input, action }: { input: CvInputState; action: string }) {
    const id = useId();
    const showText = input.mode === "text" || input.file !== null || (input.mode === "saved" && input.selectedId !== null);

    return (
        <>
            <div role="group" aria-label="How to add your CV" className="flex flex-wrap gap-2">
                {input.savedCvs.length > 0 && (
                    <FilterChip selected={input.mode === "saved"} onClick={() => input.switchMode("saved")}>
                        Saved
                    </FilterChip>
                )}
                <FilterChip selected={input.mode === "file"} onClick={() => input.switchMode("file")}>
                    Upload
                </FilterChip>
                <FilterChip selected={input.mode === "text"} onClick={() => input.switchMode("text")}>
                    Paste
                </FilterChip>
            </div>

            {input.mode === "saved" && (
                <SavedCvPicker
                    cvs={input.savedCvs}
                    selectedId={input.selectedId}
                    onSelect={input.selectSaved}
                    onRemove={input.removeSaved}
                    error={input.savedError}
                />
            )}

            {input.mode === "file" && (
                <CvFileInput file={input.file} reading={input.reading} error={input.fileError} onFile={input.chooseFile} />
            )}

            {showText && (
                <Field
                    label={input.mode === "text" ? "Your CV as text" : "What the AI will read"}
                    htmlFor={`${id}-cv`}
                    hint={
                        input.tooLong
                            ? `Too long: ${input.length.toLocaleString()} of ${L.cvMax.toLocaleString()} characters. Keep it to ${L.maxPages} pages.`
                            : input.mode === "file"
                              ? "The text read from your file, which is also what an ATS sees. Fix anything that came out wrong."
                              : input.mode === "saved"
                                ? `Your saved CV. Edits here are saved as a new copy when you ${action}.`
                                : `Paste the whole CV, up to ${L.maxPages} pages. It's saved for next time.`
                    }
                >
                    <Textarea
                        id={`${id}-cv`}
                        rows={input.mode === "text" ? 14 : 10}
                        value={input.text}
                        onChange={(event) => input.setText(event.target.value)}
                        placeholder="Paste your CV here: summary, experience, skills, education…"
                        aria-invalid={input.tooLong}
                        className="font-mono text-[12.5px] leading-relaxed"
                    />
                </Field>
            )}
        </>
    );
}
