"use client";

import { useRef, useState } from "react";
import { CircleAlert, FileText, Loader2, Upload, X } from "lucide-react";

import { cn } from "@/frontend/shared/lib";
import { CV_REVIEW_LIMITS as L } from "@/shared/contracts/cv-review";

import type { CvFileInfo } from "../hooks/use-cv-review";

/**
 * Choose a CV file: click or drop. It's read into text right here in the
 * browser (`readCvFile`); nothing is uploaded. While it's read, a spinner;
 * once read, its name and pages; when it can't be used, why.
 */
export function CvFileInput({
    file,
    reading,
    error,
    onFile,
}: {
    file: CvFileInfo | null;
    reading: boolean;
    error: string | null;
    onFile: (file: File | null) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    if (file) {
        return (
            <div className="flex items-center gap-3 rounded-card border border-border-standard bg-white/2.5 p-4">
                <div className="flex size-10 items-center justify-center rounded-control bg-accent/12">
                    <FileText className="size-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg-primary">{file.name}</p>
                    <p className="text-xs text-fg-tertiary">
                        {file.kind === "pdf" ? `PDF, ${file.pages} page${file.pages === 1 ? "" : "s"}` : "Word document"}, read in your
                        browser
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onFile(null)}
                    aria-label="Remove file"
                    className="rounded-control p-1.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                >
                    <X className="size-4" />
                </button>
            </div>
        );
    }

    return (
        <div>
            <button
                type="button"
                disabled={reading}
                onClick={() => input.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const dropped = event.dataTransfer.files[0];
                    if (dropped) onFile(dropped);
                }}
                aria-describedby={error ? "cv-file-error" : undefined}
                className={cn(
                    "flex w-full flex-col items-center justify-center rounded-card border border-dashed px-6 py-9 text-center transition-colors disabled:cursor-wait",
                    dragging ? "border-accent bg-accent/5" : "border-border-strong bg-white/1.5 hover:border-accent/50 hover:bg-white/3",
                )}
            >
                <div className="flex size-11 items-center justify-center rounded-full bg-white/5">
                    {reading ? <Loader2 className="size-5 animate-spin text-fg-tertiary" /> : <Upload className="size-5 text-fg-tertiary" />}
                </div>
                <p className="mt-3 text-sm font-medium text-fg-primary">
                    {reading ? "Reading your CV…" : "Drop your CV here, or click to choose"}
                </p>
                <p className="mt-1 text-xs text-fg-tertiary">
                    PDF or Word (.docx), up to {L.maxPages} pages and {L.maxFileBytes / (1024 * 1024)} MB. It stays in your browser.
                </p>
                <input
                    ref={input}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(event) => {
                        onFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                    }}
                />
            </button>
            {error && (
                <p id="cv-file-error" role="alert" className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-status-rose">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}
