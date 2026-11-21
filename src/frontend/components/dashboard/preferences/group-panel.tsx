"use client";

import { useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { stepTabId } from "@/frontend/components/dashboard/step-tabs";
import type { DraftPatch } from "@/frontend/components/onboarding/questions/orchestrator/draft";
import { createStep } from "@/frontend/components/onboarding/questions/orchestrator/step-factory";
import { Button } from "@/frontend/components/ui";
import type { JobField } from "@/shared/contracts/job-catalogue";
import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";

import { GROUP_LABEL } from "./groups";
import type { FormError } from "./use-preferences-form";
import { WorldwideNotice } from "./worldwide-notice";

/**
 * The open group: its heading, the onboarding step's own screen for it, its
 * error, and the links to the groups either side.
 */
export function GroupPanel({
    active,
    index,
    direction,
    onRoute,
    draft,
    update,
    catalogue,
    error,
    previous,
    next,
    open,
}: {
    active: StepId;
    index: number;
    direction: "forward" | "back";
    onRoute: boolean;
    draft: JobPreferences;
    update: (patch: DraftPatch) => void;
    catalogue: JobField[];
    error: FormError | null;
    previous: StepId | undefined;
    next: StepId | undefined;
    open: (id: StepId) => void;
}) {
    const step = createStep(active);
    const Screen = step.Screen;
    // The review step's "Edit" links are the only callers of goTo; a settings page has none.
    const noGoTo = useCallback(() => {}, []);

    return (
        <div
            id="preferences-panel"
            role="tabpanel"
            aria-labelledby={stepTabId("preferences", active)}
            className="relative overflow-hidden rounded-[24px] border border-border-subtle bg-[radial-gradient(90%_60%_at_0%_0%,oklch(0.82_0.2_145/0.06),transparent_60%)] p-6 sm:p-9"
        >
            {/* Keyed on the group so each one replays its entrance. */}
            <div key={active} className="ob-step" data-dir={direction}>
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-accent-text">
                    {String(index + 1).padStart(2, "0")} · {GROUP_LABEL[active]}
                </p>
                <h2 className="mt-2 text-[26px] font-semibold leading-[1.1] tracking-[-0.04em] text-fg-primary sm:text-[30px]">
                    {step.title}
                </h2>
                <p className="mt-2.5 max-w-[56ch] text-sm leading-relaxed text-fg-tertiary">{step.description}</p>

                <div className="mt-8">
                    {onRoute ? (
                        <Screen draft={draft} update={update} goTo={noGoTo} catalogue={catalogue} />
                    ) : (
                        <WorldwideNotice onOpenLocation={() => open("location")} />
                    )}
                </div>

                {error?.stepId === active && (
                    <p key={error.message} role="alert" className="ob-shake mt-6 text-sm text-status-rose">
                        {error.message}
                    </p>
                )}
            </div>

            <GroupNav previous={previous} next={next} open={open} />
        </div>
    );
}

/** The links to the previous and next group, under the panel. */
function GroupNav({
    previous,
    next,
    open,
}: {
    previous: StepId | undefined;
    next: StepId | undefined;
    open: (id: StepId) => void;
}) {
    return (
        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
            {previous ? (
                <Button variant="quiet" onClick={() => open(previous)}>
                    <ArrowLeft /> {GROUP_LABEL[previous]}
                </Button>
            ) : (
                <span />
            )}
            {next && (
                <Button variant="secondary" onClick={() => open(next)} className="group">
                    {GROUP_LABEL[next]}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
            )}
        </div>
    );
}
