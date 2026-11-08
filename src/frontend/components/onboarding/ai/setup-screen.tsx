"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Check } from "lucide-react";

import { runSetupStepAction } from "@/backend/actions/setup";
import {
    SETUP_STEPS,
    type SetupStepId,
    type SetupStepResult,
} from "@/backend/modules/job-search/domain/setup-steps";
import { WORK_MODE_LABEL } from "@/frontend/components/onboarding/labels";
import { JobakMark } from "@/frontend/components/shared/jobak-logo";
import { Button } from "@/frontend/components/ui";
import { countryName } from "@/frontend/lib/configs/countries";
import { cn } from "@/frontend/lib/utils/utils";

const STEP_TITLE: Record<SetupStepId, string> = {
    preferences: "Saving your job preferences",
    search: "Building your search",
    sources: "Getting your job sources ready",
};

/** Ring segments: the three setup steps, then connecting the AI — the user's. */
const TOTAL = SETUP_STEPS.length + 1;

/** Shortest time a step stays on screen, so a fast database doesn't flash past. */
const MIN_STEP_MS = 650;
/** Gap between one sub-step appearing and the next. */
const LINE_STAGGER_MS = 420;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One sub-step: a label, and either a number that counts up or a short text. */
interface Line {
    label: string;
    value?: number;
    text?: string;
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(iso: string): string {
    const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
    if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) return relativeTime.format(hours, "hour");
    return relativeTime.format(Math.round(hours / 24), "day");
}

/** What a step's result reads as, line by line. Formatting only — the numbers come from the server. */
function linesFor(result: SetupStepResult): { lines: Line[]; note?: string } {
    if (!result.ok) return { lines: [{ label: result.message, text: "Skipped" }] };

    switch (result.step) {
        case "preferences": {
            const d = result.data;
            return {
                lines: [
                    { label: "Job titles", value: d.titles },
                    d.worldwide
                        ? { label: "Location", text: "Anywhere, remote" }
                        : {
                              label: d.countries.length === 1 ? "Country" : "Countries",
                              text:
                                  d.countries.length <= 2
                                      ? d.countries.map(countryName).join(", ")
                                      : `${d.countries.length} countries`,
                          },
                    { label: "Work modes", text: d.workModes.map((m) => WORK_MODE_LABEL[m]).join(", ") || "Any" },
                ],
            };
        }
        case "search": {
            const d = result.data;
            return {
                lines: [
                    { label: "Active jobs in Jobak", value: d.total },
                    { label: "Matching your job titles", value: d.matchingTitles },
                    { label: "In your locations", value: d.inLocations },
                    { label: "In your work modes", value: d.matching },
                ],
                note:
                    d.matching > 0
                        ? `${d.matching.toLocaleString()} ${d.matching === 1 ? "job is" : "jobs are"} ready for your AI to score.`
                        : "No matching jobs yet. Jobak starts collecting for your search now.",
            };
        }
        case "sources": {
            const d = result.data;
            const names = d.withJobs.map((s) => s.name);
            return {
                lines: [
                    { label: "Job sources Jobak collects from", value: d.active },
                    { label: "With jobs for your search", value: d.withJobs.length },
                    { label: "Newest matching job", text: d.newestAt ? ago(d.newestAt) : "Collecting starts now" },
                ],
                note: names.length
                    ? `Most from ${names.slice(0, 3).join(", ")}${names.length > 3 ? " and more" : ""}.`
                    : undefined,
            };
        }
    }
}

/** A short recap of a finished step, for the summary chips at the end. */
function recapOf(result: SetupStepResult | undefined): string | null {
    if (!result?.ok) return null;
    switch (result.step) {
        case "preferences":
            return "Preferences saved";
        case "search":
            return `${result.data.matching.toLocaleString()} matching ${result.data.matching === 1 ? "job" : "jobs"}`;
        case "sources":
            return `${result.data.active} job sources`;
    }
}

/**
 * The bridge between the two onboardings.
 *
 * Runs the setup steps one after another — each a server action doing real
 * work against the database (`modules/job-search`) — and shows only the step
 * in progress: its title, then its sub-steps one by one, numbers counting up.
 * The ring around the logo fills a segment as each step finishes; the last
 * segment is connecting the AI, left for the user.
 *
 * With an empty database the steps still run and say so ("No matching jobs
 * yet"); a step that fails says it was skipped and the setup carries on —
 * nothing here may stand between the user and connecting their AI.
 */
export function PreparingScreen({ summary, onContinue }: { summary: string; onContinue: () => void }) {
    const [current, setCurrent] = useState(0);
    const [done, setDone] = useState(0);
    const [results, setResults] = useState<Partial<Record<SetupStepId, SetupStepResult>>>({});

    useEffect(() => {
        // Set on unmount (and on React's dev double-mount), so an abandoned run stops.
        let cancelled = false;
        const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        (async () => {
            for (const [i, step] of SETUP_STEPS.entries()) {
                if (cancelled) return;
                setCurrent(i);

                const [result] = await Promise.all([
                    runSetupStepAction(step).catch(
                        (): SetupStepResult => ({ ok: false, step, message: "Couldn't check this right now." }),
                    ),
                    wait(instant ? 0 : MIN_STEP_MS),
                ]);
                if (cancelled) return;
                setResults((all) => ({ ...all, [step]: result }));

                // Let its sub-steps appear and count before moving on.
                const shown = linesFor(result).lines.length;
                await wait(instant ? 0 : shown * LINE_STAGGER_MS + 900);
                if (cancelled) return;
                setDone(i + 1);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const ready = done >= SETUP_STEPS.length;
    const step = SETUP_STEPS[Math.min(current, SETUP_STEPS.length - 1)]!;
    const result = results[step];
    const view = result ? linesFor(result) : null;

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
            <ProgressRing done={done} total={TOTAL} ready={ready} />

            <p className="mt-6 text-[12px] font-medium uppercase tracking-[0.08em] text-accent-text" aria-live="polite">
                {ready ? `Step ${TOTAL} of ${TOTAL}` : `Step ${current + 1} of ${TOTAL}`}
            </p>

            {ready ? (
                <div key="ready" className="w-full">
                    <h1 className="ob-headline mt-2 text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-fg-primary sm:text-[38px]">
                        Now it&apos;s time to connect your AI
                    </h1>
                    <p
                        className="ob-headline mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-fg-tertiary"
                        style={{ "--ob-delay": "90ms" } as CSSProperties}
                    >
                        Jobak scores every job it finds with an AI you connect: your own key, on your own account. It
                        takes about a minute.
                    </p>

                    <ul className="mt-7 flex flex-wrap justify-center gap-2">
                        {SETUP_STEPS.map((id, i) => {
                            const recap = recapOf(results[id]);
                            if (!recap) return null;
                            return (
                                <li
                                    key={id}
                                    className="ob-rise inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-white/2 px-3 py-1 text-[12px] text-fg-secondary"
                                    style={{ "--i": i } as CSSProperties}
                                >
                                    <Check className="size-3 text-accent" strokeWidth={3} />
                                    {recap}
                                </li>
                            );
                        })}
                    </ul>

                    <div className="ob-rise mt-8" style={{ "--i": 4 } as CSSProperties}>
                        <Button variant="primary" size="lg" onClick={onContinue} className="group">
                            Connect my AI <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                        </Button>
                    </div>
                </div>
            ) : (
                // Keyed on the step so each one slides in fresh.
                <div key={step} className="ob-step w-full">
                    <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-fg-primary sm:text-[32px]">
                        {STEP_TITLE[step]}
                    </h1>
                    {step === "search" && <p className="mt-2 text-sm text-fg-tertiary">{summary}</p>}

                    <div className="mt-7 min-h-[188px] w-full">
                        {view ? (
                            <>
                                <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-white/2 text-left">
                                    {view.lines.map((line, i) => (
                                        <li
                                            key={line.label}
                                            className="ob-rise flex items-center gap-3 px-4 py-3 text-sm"
                                            style={{ animationDelay: `${i * LINE_STAGGER_MS}ms` }}
                                        >
                                            <Check className="size-3.5 shrink-0 text-accent" strokeWidth={3} />
                                            <span className="min-w-0 flex-1 truncate text-fg-secondary">{line.label}</span>
                                            <span className="shrink-0 font-medium tabular-nums text-fg-primary">
                                                {line.value !== undefined ? (
                                                    <CountUp value={line.value} delay={i * LINE_STAGGER_MS} />
                                                ) : (
                                                    line.text
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {view.note && (
                                    <p
                                        className="ob-rise mt-3 text-[13px] text-fg-tertiary"
                                        style={{ animationDelay: `${view.lines.length * LINE_STAGGER_MS}ms` }}
                                    >
                                        {view.note}
                                    </p>
                                )}
                            </>
                        ) : (
                            // While the server works: placeholder rows, so the card doesn't jump in.
                            <ul className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-white/2">
                                {[0, 1, 2].map((i) => (
                                    <li key={i} className="flex items-center gap-3 px-4 py-3.5">
                                        <span className="size-3.5 animate-pulse rounded-full bg-white/10" />
                                        <span
                                            className="h-2.5 animate-pulse rounded-full bg-white/8"
                                            style={{ width: `${55 - i * 10}%`, animationDelay: `${i * 120}ms` }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** A number that counts up from zero after `delay`, easing out. Instant under reduced motion. */
function CountUp({ value, delay }: { value: number; delay: number }) {
    const [shown, setShown] = useState(0);

    useEffect(() => {
        const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let frame = 0;
        const start = performance.now() + (instant ? 0 : delay);
        const duration = instant ? 0 : 700;

        const tick = (now: number) => {
            const progress = duration === 0 ? 1 : Math.min(1, Math.max(0, (now - start) / duration));
            setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value, delay]);

    return <>{shown.toLocaleString()}</>;
}

/**
 * The logo inside a ring of segments, one per step.
 *
 * Each segment draws itself in (stroke-dashoffset → 0) as its step finishes,
 * the one in progress breathes, and the last — connecting the AI — stays open
 * and pulses once the setup is done: it's the user's to fill. A dot rides the
 * end of the progress. Decorative; the step text says the same in words.
 */
function ProgressRing({ done, total, ready }: { done: number; total: number; ready: boolean }) {
    const size = 184;
    const c = size / 2;
    const r = 80;
    const circumference = 2 * Math.PI * r;
    const gapDeg = 10; // space between segments
    const segDeg = 360 / total - gapDeg;
    const segLen = (segDeg / 360) * circumference;
    // The head dot sits at the end of the last finished segment.
    const headDeg = done === 0 ? gapDeg / 2 : done * (360 / total) - gapDeg / 2;

    return (
        <div aria-hidden="true" className="relative flex size-46 items-center justify-center">
            {ready && <span className="ob-ripple absolute size-24 rounded-full bg-accent/15" />}

            {/* -90°: segments start at twelve o'clock and run clockwise. */}
            <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90 overflow-visible">
                {Array.from({ length: total }, (_, i) => {
                    const rotate = `rotate(${i * (360 / total) + gapDeg / 2} ${c} ${c})`;
                    const filled = i < done;
                    const current = i === done && !ready;
                    const yours = ready && i === total - 1;
                    return (
                        <g key={i} transform={rotate}>
                            {/* Track */}
                            <circle
                                cx={c}
                                cy={c}
                                r={r}
                                fill="none"
                                strokeWidth={5}
                                strokeLinecap="round"
                                strokeDasharray={`${segLen} ${circumference}`}
                                className={cn(
                                    yours ? "animate-pulse stroke-accent/40" : current ? "animate-pulse stroke-white/18" : "stroke-white/8",
                                )}
                            />
                            {/* Fill, drawn in from the segment's start. */}
                            <circle
                                cx={c}
                                cy={c}
                                r={r}
                                fill="none"
                                strokeWidth={5}
                                strokeLinecap="round"
                                strokeDasharray={`${segLen} ${circumference}`}
                                // Past the start by more than the cap's radius, or the round cap leaves a dot.
                                strokeDashoffset={filled ? 0 : segLen + 8}
                                className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            />
                        </g>
                    );
                })}

                {/* The head: a bright dot riding the end of the progress. */}
                <g
                    style={{ transform: `rotate(${headDeg}deg)`, transformOrigin: `${c}px ${c}px` }}
                    className={cn(
                        "transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        done === 0 ? "opacity-0" : "opacity-100",
                    )}
                >
                    <circle cx={c + r} cy={c} r={7} className="fill-accent/25" />
                    <circle cx={c + r} cy={c} r={3.5} className="fill-[#eafff1]" />
                </g>
            </svg>

            <span
                className={cn(
                    "relative flex size-24 items-center justify-center rounded-full border bg-[#141718] transition-[border-color,box-shadow] duration-700",
                    ready ? "border-accent/45 shadow-[0_0_56px_-10px_oklch(0.82_0.2_145/0.65)]" : "border-white/10",
                )}
            >
                <JobakMark size={42} />
            </span>
        </div>
    );
}
