"use client";

import { useEffect, useId, useRef } from "react";
import { Check, ChevronDown, CircleAlert, Copy, Download, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/frontend/shared/ui";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { useSkillDialog } from "../hooks/use-skill-dialog";

/** How to use a skill, in order. */
const STEPS = [
    "Pick a version, then copy it or download it as a file.",
    "Paste it into ChatGPT, Claude, Gemini or any assistant you like, as your first message.",
    "Then give it what it asks for: your CV, the job posting, and anything else.",
];

/** "22 Nov 2026", from a `YYYY-MM-DD` date, without a time-zone shift. */
function formatDate(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

/**
 * "Use in your own AI": a tool's versioned skill (from the skills repository,
 * jobak-net/career-agent-skills) to copy or download, for people who'd rather run the same
 * job in their own assistant. A version dropdown picks which one; its content
 * is fetched when the popup opens (`useSkillDialog`). Shared by the AI tools.
 */
export function SkillButton({ skill }: { skill: SkillVersionsResponse }) {
    const dialog = useSkillDialog(skill);

    return (
        <>
            <Button variant="secondary" onClick={dialog.show}>
                <Sparkles /> Use in your own AI
            </Button>
            <SkillDialog skill={skill} dialog={dialog} />
        </>
    );
}

function SkillDialog({ skill, dialog: state }: { skill: SkillVersionsResponse; dialog: ReturnType<typeof useSkillDialog> }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const preview = useRef<HTMLPreElement>(null);
    const id = useId();

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (state.open && !element.open) element.showModal();
        if (!state.open && element.open) element.close();
    }, [state.open]);

    async function copy() {
        if (await state.copy()) return;
        // Clipboard blocked: select the text so Ctrl+C works.
        const range = document.createRange();
        if (preview.current) range.selectNodeContents(preview.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
    }

    return (
        <dialog
            ref={dialog}
            aria-labelledby={`${id}-title`}
            onCancel={(event) => {
                event.preventDefault();
                state.hide();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) state.hide();
            }}
            className="m-auto w-[min(720px,calc(100vw-2rem))] rounded-hero border border-border-standard bg-bg-panel p-0 text-fg-primary shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop:bg-black/60"
        >
            <div className="flex max-h-[min(88dvh,880px)] flex-col p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-[-0.02em]">
                            Use the {skill.title.toLowerCase()} skill in your own AI
                        </h2>
                        {skill.description && (
                            <p className="mt-1 text-[13px] leading-relaxed text-fg-tertiary">{skill.description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={state.hide}
                        aria-label="Close"
                        className="-mr-2 -mt-1 rounded-control p-1.5 text-fg-tertiary hover:bg-white/5 hover:text-fg-primary"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <ol className="mt-5 space-y-2">
                    {STEPS.map((step, i) => (
                        <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-fg-secondary">
                            <span
                                aria-hidden="true"
                                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] tabular-nums text-fg-tertiary"
                            >
                                {i + 1}
                            </span>
                            {step}
                        </li>
                    ))}
                </ol>

                {/* ── Version ── */}
                <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                    <div>
                        <label htmlFor={`${id}-version`} className="block text-[13px] font-medium text-fg-primary">
                            Version
                        </label>
                        <div className="relative mt-1.5">
                            <select
                                id={`${id}-version`}
                                value={state.version}
                                onChange={(event) => state.pick(event.target.value)}
                                className="h-9 appearance-none rounded-control border border-border-standard bg-white/2.5 pl-3 pr-9 text-sm text-fg-primary transition-colors focus:border-accent/45 focus:outline-none"
                            >
                                {skill.versions.map((v) => (
                                    <option key={v.version} value={v.version} className="bg-bg-panel">
                                        {v.version}
                                        {v.version === skill.latest ? " (latest)" : ""}, {formatDate(v.date)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-tertiary" />
                        </div>
                    </div>
                    {state.info.notes && (
                        <p className="min-w-0 flex-1 pb-2 text-[13px] leading-relaxed text-fg-tertiary">
                            {!state.isLatest && <span className="text-status-amber">Older version. </span>}
                            {state.info.notes}
                        </p>
                    )}
                </div>

                {/* ── Content ── */}
                {state.error ? (
                    <div className="mt-4 flex min-h-40 flex-1 flex-col items-center justify-center gap-3 rounded-card border border-border-subtle p-6 text-center">
                        <p className="flex items-center gap-2 text-[13px] text-status-rose">
                            <CircleAlert className="size-4 shrink-0" /> {state.error}
                        </p>
                        <Button variant="secondary" size="sm" onClick={state.retry}>
                            Try again
                        </Button>
                    </div>
                ) : state.content === null ? (
                    <div
                        aria-busy="true"
                        className="mt-4 flex min-h-40 flex-1 items-center justify-center gap-2 rounded-card border border-border-subtle text-[13px] text-fg-tertiary"
                    >
                        <Loader2 className="size-4 animate-spin" /> Loading version {state.version}
                    </div>
                ) : (
                    <pre
                        ref={preview}
                        tabIndex={0}
                        aria-label={`${state.fileName}, version ${state.version}`}
                        className="mt-4 min-h-40 flex-1 overflow-auto whitespace-pre-wrap wrap-break-word rounded-card border border-border-subtle bg-black/30 p-4 font-mono text-[12px] leading-relaxed text-fg-secondary"
                    >
                        {state.content}
                    </pre>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] text-fg-quaternary">
                        {state.fileName}, version {state.version}
                        {state.content ? `, ${state.content.trimEnd().split("\n").length.toLocaleString()} lines` : ""}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={state.download} disabled={!state.content}>
                            <Download /> Download
                        </Button>
                        <Button variant="primary" onClick={copy} disabled={!state.content}>
                            {state.copied ? <Check /> : <Copy />}
                            {state.copied ? "Copied" : "Copy skill"}
                        </Button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}
