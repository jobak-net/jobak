"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/frontend/shared/ui";

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
