"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { completeOnboardingAction } from "@/backend/actions/onboarding";
import type { JobPreferences } from "@/backend/modules/preferences/domain/job-preferences";
import {
    STEPS,
    initialOnboardingState,
    onboardingReducer,
    progressOf,
    type DraftPatch,
    type StepId,
} from "@/backend/modules/preferences/domain/onboarding";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { Button } from "@/frontend/components/ui";
import { AI_SETUP_HREF } from "@/frontend/lib/configs/cta";
import type { JobField } from "@/frontend/lib/configs/job-titles";
import { cn } from "@/frontend/lib/utils/utils";

import { SearchPreview } from "./search-preview";
import { STEP_SCREENS } from "./step-screens";

/**
 * Onboarding, one step at a time.
 *
 * Driven entirely by the State-pattern flow from `modules/preferences`: the
 * reducer holds the step and the draft, each step decides whether it is done
 * and what comes next. This component draws the current step and forwards
 * clicks — it contains no routing or validation rules of its own.
 *
 * Two columns on large screens: the question on the left, and on the right a
 * live preview of the search the answers are building. Phones get the left
 * column only.
 *
 * Finishing calls the server, which runs the same steps again before saving.
 * If it refuses (a hand-edited draft, say), the flow jumps to the step it
 * named and shows its message there.
 */
export function OnboardingFlow({
    initial,
    catalogue,
    firstName,
}: {
    initial?: JobPreferences;
    catalogue: JobField[];
    firstName: string | null;
}) {
    const router = useRouter();
    const [state, dispatch] = useReducer(onboardingReducer, initial, initialOnboardingState);
    const [serverError, setServerError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();
    /** Bumped on every Continue, so a repeated refusal shakes again instead of sitting still. */
    const [attempt, setAttempt] = useState(0);
    const scroller = useRef<HTMLElement>(null);

    const step = STEPS[state.stepId];
    const Screen = STEP_SCREENS[state.stepId];
    const { index, total, route } = progressOf(state);
    const isFirst = index === 0;
    const isLast = step.next(state.draft) === null;
    const error = state.error ?? serverError;

    // Which way the step changed, so it can slide in from that side. Derived
    // during render (React's "store information from previous renders").
    const [shown, setShown] = useState<{ stepId: StepId; index: number; dir: "forward" | "back" }>({
        stepId: state.stepId,
        index,
        dir: "forward",
    });
    if (shown.stepId !== state.stepId) {
        setShown({ stepId: state.stepId, index, dir: index >= shown.index ? "forward" : "back" });
    }

    // A new step starts at its top, whichever element is scrolling.
    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
    }, [state.stepId]);

    // Stable for the page's lifetime (dispatch and setters never change), so the
    // memoised options in the screens only re-render when their own state does.
    const update = useCallback((patch: DraftPatch) => {
        setServerError(null);
        dispatch({ type: "update", patch });
    }, []);
    const goTo = useCallback((stepId: StepId) => dispatch({ type: "goTo", stepId }), []);

    function next() {
        setAttempt((n) => n + 1);
        dispatch({ type: "next" });
    }

    function finish() {
        setServerError(null);
        setAttempt((n) => n + 1);
        startSaving(async () => {
            try {
                const result = await completeOnboardingAction(state.draft);
                if (result.ok) {
                    // Next: connecting the AI, the second (required) part of onboarding.
                    router.replace(AI_SETUP_HREF);
                    return;
                }
                dispatch({ type: "goTo", stepId: result.stepId });
                setServerError(result.message);
            } catch {
                setServerError("We couldn't save your answers. Check your connection and try again.");
            }
        });
    }

    return (
        <div className="relative grid min-h-dvh bg-(--bg-canvas) lg:h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:overflow-hidden">
            {/* ── Left: the question ─────────────────────────────────────── */}
            <div className="relative flex min-h-dvh flex-col lg:min-h-0">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-56 -top-64 size-180 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.09),transparent)]"
                />

                <header className="relative z-10 px-6 pt-6 sm:px-10 lg:px-14">
                    <div className="flex items-center justify-between">
                        {/* Not a link: leaving mid-way would abandon the answers. */}
                        <JobakLogo showText href="" />
                        <p className="text-[13px] tabular-nums text-fg-tertiary" aria-live="polite">
                            Step {index + 1} of {total}
                        </p>
                    </div>
                    <SegmentedProgress route={route} index={index} />
                </header>

                <main ref={scroller} className="relative z-10 flex-1 px-6 sm:px-10 lg:overflow-y-auto lg:px-14">
                    <div className="mx-auto w-full max-w-xl py-10 lg:py-14">
                        {/* Keyed on the step so each one replays its entrance. */}
                        <div key={state.stepId} className="ob-step" data-dir={shown.dir}>
                            {isFirst && (
                                <p className="mb-3 text-sm text-accent-text">
                                    Welcome{firstName ? `, ${firstName}` : ""}. A few questions and Jobak starts searching for
                                    you.
                                </p>
                            )}
                            <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-fg-primary sm:text-[38px]">
                                {step.title}
                            </h1>
                            <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{step.description}</p>

                            <div className="mt-9">
                                <Screen
                                    draft={state.draft}
                                    update={update}
                                    goTo={goTo}
                                    catalogue={catalogue}
                                />
                            </div>
                        </div>
                    </div>
                </main>

                {/*
                 * The message sits beside the buttons, not under the step: on the
                 * location step the country list pushed it below the fold, so a
                 * refused Continue looked like a button that did nothing.
                 */}
                <footer className="sticky bottom-0 z-20 border-t border-border-subtle bg-(--bg-canvas)/85 px-6 py-4 backdrop-blur-md sm:px-10 lg:static lg:border-t-0 lg:bg-transparent lg:px-14 lg:pb-8 lg:backdrop-blur-none">
                    <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-3">
                        {!isFirst && (
                            <Button variant="secondary" onClick={() => dispatch({ type: "back" })} disabled={saving}>
                                <ArrowLeft /> Back
                            </Button>
                        )}

                        {isLast ? (
                            <Button variant="primary" onClick={finish} disabled={saving}>
                                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                                {saving ? "Saving" : "Start my search"}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={next} className="group">
                                Continue <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                            </Button>
                        )}

                        {error && (
                            <p
                                key={attempt}
                                role="alert"
                                className="ob-shake min-w-0 basis-full text-sm text-status-rose sm:basis-auto sm:flex-1"
                            >
                                {error}
                            </p>
                        )}
                    </div>
                </footer>
            </div>

            {/* ── Right: the search being built ──────────────────────────── */}
            <aside className="hidden p-3 pl-0 lg:block">
                <SearchPreview draft={state.draft} stepId={state.stepId} />
            </aside>
        </div>
    );
}

/**
 * One segment per step on the current route. Finished steps fill with the
 * accent; the current one is only outlined, because nothing in it is done yet.
 * (The old single bar counted the current step as done, so it showed a fifth
 * filled before anything was answered.)
 */
function SegmentedProgress({ route, index }: { route: StepId[]; index: number }) {
    return (
        <div
            role="progressbar"
            aria-label="Onboarding progress"
            aria-valuemin={0}
            aria-valuemax={route.length}
            aria-valuenow={index}
            aria-valuetext={`${index} of ${route.length} steps done`}
            className="mt-5 flex gap-1.5"
        >
            {route.map((id, i) => (
                <span
                    key={id}
                    className={cn(
                        "relative h-1 flex-1 overflow-hidden rounded-full transition-colors duration-500",
                        i === index ? "bg-white/18" : "bg-white/7",
                    )}
                >
                    <span
                        className={cn(
                            "absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            i < index ? "scale-x-100" : "scale-x-0",
                        )}
                    />
                </span>
            ))}
        </div>
    );
}
