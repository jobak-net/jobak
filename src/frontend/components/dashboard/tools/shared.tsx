"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/frontend/components/ui";
import { cn } from "@/frontend/lib/utils/utils";

/**
 * What the AI tools have in common while they are previews: an input, a run
 * button, a short wait, and a sample result.
 *
 * The wait is deliberate. Results appearing instantly would misrepresent what
 * the real tool will feel like, and the loading state is part of what needs
 * designing. When a tool goes live, `run` is replaced with the real call and the
 * rest of the component stays as it is.
 */
export function useSimulatedRun(durationMs = 1400) {
    const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

    function run() {
        setStatus("running");
        window.setTimeout(() => setStatus("done"), durationMs);
    }

    return { status, run, reset: () => setStatus("idle") };
}

export function RunButton({
    status,
    disabled,
    onClick,
    children,
}: {
    status: "idle" | "running" | "done";
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <Button variant="primary" onClick={onClick} disabled={disabled || status === "running"}>
            {status === "running" ? <Loader2 className="animate-spin" /> : null}
            {status === "running" ? "Working…" : children}
        </Button>
    );
}

/**
 * Choose a CV: click or drop. Nothing is uploaded — the file stays in the page
 * and only its name is shown, since there is no backend to send it to yet.
 */
export function CvDropzone({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
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
                    <p className="text-xs text-fg-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
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
        <button
            type="button"
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
            className={cn(
                "flex w-full flex-col items-center justify-center rounded-card border border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-accent bg-accent/5" : "border-border-strong bg-white/1.5 hover:border-accent/50 hover:bg-white/3",
            )}
        >
            <div className="flex size-11 items-center justify-center rounded-full bg-white/5">
                <Upload className="size-5 text-fg-tertiary" />
            </div>
            <p className="mt-3 text-sm font-medium text-fg-primary">Drop your CV here, or click to choose</p>
            <p className="mt-1 text-xs text-fg-tertiary">PDF or Word, up to 5 MB</p>
            <input
                ref={input}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
        </button>
    );
}

/** Grey blocks in the rough shape of a result, while the tool works. */
function ResultSkeleton() {
    return (
        <div aria-busy="true" aria-label="Working" className="rounded-card border border-border-subtle p-6">
            <div className="flex items-center gap-5">
                <div className="size-16 animate-pulse rounded-full bg-white/6" />
                <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-white/6" />
                    <div className="h-3 w-64 max-w-full animate-pulse rounded bg-white/4" />
                </div>
            </div>
            <div className="mt-8 space-y-5">
                {[72, 88, 56, 80].map((width) => (
                    <div key={width} className="space-y-2">
                        <div className="h-3 animate-pulse rounded bg-white/5" style={{ width: `${width}%` }} />
                        <div className="h-1.5 w-full animate-pulse rounded-full bg-white/4" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Where a result appears: an empty state first, a skeleton while running. */
export function ResultArea({
    status,
    emptyTitle,
    emptyHint,
    children,
}: {
    status: "idle" | "running" | "done";
    emptyTitle: string;
    emptyHint: string;
    children: React.ReactNode;
}) {
    if (status === "done") return <div className="dash-enter">{children}</div>;
    if (status === "running") return <ResultSkeleton />;

    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-card border border-dashed border-border-standard px-6 py-12 text-center">
            <p className="text-sm font-medium text-fg-primary">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-fg-tertiary">{emptyHint}</p>
        </div>
    );
}

/**
 * A result as one sheet: sections divided by hairlines, not a card each.
 * Stacking five boxed cards made every part of a report look equally
 * important; one surface with dividers reads as one document.
 */
export function ResultSheet({ children }: { children: React.ReactNode }) {
    return (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-(image:--surface-1)">
            {children}
        </div>
    );
}

export function ResultSection({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <section className="p-5 sm:p-6">
            {title && <h3 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">{title}</h3>}
            {children}
        </section>
    );
}

/** The input column every tool has on its left. */
export function ToolInput({ children }: { children: React.ReactNode }) {
    return <div className="h-fit space-y-5 rounded-card border border-border-subtle p-5">{children}</div>;
}
