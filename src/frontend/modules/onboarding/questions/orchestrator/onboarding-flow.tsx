"use client";

import type { RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { JobakLogo, Button } from "@/frontend/shared/ui";
import { cn } from "@/frontend/shared/lib";
import type { JobField } from "@/shared/contracts/job-catalogue";
import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";

import { SearchPreview } from "../../shared/search-preview";
import { SegmentedProgress } from "./segmented-progress";
import type { StepScreenProps, StepStrategy } from "./step-strategy";
import { useOnboarding } from "./use-onboarding";

/**
 * Onboarding, one step at a time.
 *
 * The onboarding questions are vertical slices under one orchestrator:
 *
 *     orchestrator/            runs the flow (this folder)
 *       onboarding-flow.tsx      the layout (this file)
 *       use-onboarding.ts        the state: current step, answers, next / back / goTo / finish
 *       step-factory.ts          builds the step strategies (createSteps / createStep)
 *       step-strategy.ts         the interface every step implements
 *       (the final submit, POST /api/v1/onboarding, is `lib/api/onboarding`)
 *       saved-progress.ts        unsaved answers kept in this browser
 *       draft.ts                 how an edit is applied to the answers
 *     steps/<step>/            one folder per step: everything for that step
 *       <step>-step.ts           the strategy: shared rules + the screen
 *       <step>-screen.tsx        the screen
 *       …                        anything only that step uses
 *     ui/                      small pieces several steps share
 *
 * Each step's rules live in a matching slice on the shared side,
 * `src/shared/onboarding/steps/<step>/rules.ts`, because the backend runs them
 * too.
 *
 * This file only draws: `useOnboarding` says what to show, and the pieces
 * below each draw one region of the screen. No validation rules here — those
 * are the steps', in `@/shared/onboarding`.
 *
 * Two columns on large screens: the question on the left, and on the right a
 * live preview of the search the answers are building. Phones get the left
 * column only.
 *
 *     ┌──────────────────────────┬───────────────────┐
 *     │ FlowHeader               │                   │
 *     │ StepPanel                │   PreviewPanel    │
 *     │ FlowFooter               │                   │
 *     └──────────────────────────┴───────────────────┘
 */
export function OnboardingFlow({
    initial,
    catalogue,
    firstName,
    storageKey,
}: {
    initial?: JobPreferences;
    catalogue: JobField[];
    firstName: string | null;
    /** Where this browser keeps the user's unsaved answers (see `saved-progress.ts`). */
    storageKey: string;
}) {
    const flow = useOnboarding(initial, storageKey);

    return (
        <div
            // Hidden only until saved answers are restored (one frame after hydration),
            // so a refresh never flashes the first step before jumping to the right one.
            aria-busy={!flow.ready}
            className={cn(
                "relative grid min-h-dvh bg-(--bg-canvas) lg:h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-1 lg:overflow-hidden",
                !flow.ready && "invisible",
            )}
        >
            {/* ── Left: the question ─────────────────────────────────────── */}
            <div className="relative flex min-h-dvh flex-col lg:min-h-0">
                <BackgroundGlow />
                <FlowHeader index={flow.index} total={flow.total} route={flow.route} />
                <StepPanel
                    step={flow.step}
                    direction={flow.direction}
                    scrollerRef={flow.scroller}
                    welcome={flow.isFirst ? firstName ?? "" : null}
                    screen={{ draft: flow.draft, update: flow.update, goTo: flow.goTo, catalogue }}
                />
                <FlowFooter
                    isFirst={flow.isFirst}
                    isLast={flow.isLast}
                    saving={flow.saving}
                    error={flow.error}
                    attempt={flow.attempt}
                    onBack={flow.back}
                    onNext={flow.next}
                    onFinish={flow.finish}
                />
            </div>

            {/* ── Right: the search being built ──────────────────────────── */}
            <PreviewPanel draft={flow.draft} stepId={flow.step.id} />
        </div>
    );
}

/** The soft accent glow behind the question column's top-left corner. */
function BackgroundGlow() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-56 -top-64 size-180 bg-[radial-gradient(closest-side,oklch(0.82_0.2_145/0.09),transparent)]"
        />
    );
}

/** The logo, "Step n of m", and one progress segment per step on the route. */
function FlowHeader({ index, total, route }: { index: number; total: number; route: StepId[] }) {
    return (
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
    );
}

/**
 * The current step: its heading, its description and its screen. Keyed on the
 * step so each one replays its entrance, sliding in from the side it came from.
 *
 * `welcome` is the user's first name ("" when unknown) on the first step, and
 * null on every other step.
 */
function StepPanel({
    step,
    direction,
    scrollerRef,
    welcome,
    screen,
}: {
    step: StepStrategy;
    direction: "forward" | "back";
    scrollerRef: RefObject<HTMLElement | null>;
    welcome: string | null;
    screen: StepScreenProps;
}) {
    const Screen = step.Screen;

    return (
        <main ref={scrollerRef} className="relative z-10 flex-1 px-6 sm:px-10 lg:overflow-y-auto lg:px-14">
            <div className="mx-auto w-full max-w-xl py-10 lg:py-14">
                <div key={step.id} className="ob-step" data-dir={direction}>
                    {welcome !== null && (
                        <p className="mb-3 text-sm text-accent-text">
                            Welcome{welcome ? `, ${welcome}` : ""}. A few questions and Jobak starts searching for you.
                        </p>
                    )}
                    <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-fg-primary sm:text-[38px]">
                        {step.title}
                    </h1>
                    <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{step.description}</p>

                    <div className="mt-9">
                        <Screen {...screen} />
                    </div>
                </div>
            </div>
        </main>
    );
}

/**
 * Back, Continue (or "Start my search" on the last step), and the error.
 *
 * The message sits beside the buttons, not under the step: on the location
 * step the country list pushed it below the fold, so a refused Continue looked
 * like a button that did nothing. Keyed on `attempt` so a repeated refusal
 * shakes again.
 */
function FlowFooter({
    isFirst,
    isLast,
    saving,
    error,
    attempt,
    onBack,
    onNext,
    onFinish,
}: {
    isFirst: boolean;
    isLast: boolean;
    saving: boolean;
    error: string | null;
    attempt: number;
    onBack: () => void;
    onNext: () => void;
    onFinish: () => void;
}) {
    return (
        <footer className="sticky bottom-0 z-20 border-t border-border-subtle bg-(--bg-canvas)/85 px-6 py-4 backdrop-blur-md sm:px-10 lg:static lg:border-t-0 lg:bg-transparent lg:px-14 lg:pb-8 lg:backdrop-blur-none">
            <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-3">
                {!isFirst && (
                    <Button variant="secondary" onClick={onBack} disabled={saving}>
                        <ArrowLeft /> Back
                    </Button>
                )}

                {isLast ? (
                    <Button variant="primary" onClick={onFinish} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" /> : <Check />}
                        {saving ? "Saving" : "Start my search"}
                    </Button>
                ) : (
                    <Button variant="primary" onClick={onNext} className="group">
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
    );
}

/** The live preview of the search the answers are building. Large screens only. */
function PreviewPanel({ draft, stepId }: { draft: JobPreferences; stepId: StepId }) {
    return (
        <aside className="hidden p-3 pl-0 lg:block">
            <SearchPreview draft={draft} stepId={stepId} />
        </aside>
    );
}
