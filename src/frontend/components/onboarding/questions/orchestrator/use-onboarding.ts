"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId } from "@/shared/onboarding/step-rules";
import { applySearchRules, EMPTY_PREFERENCES } from "@/shared/preferences/search-rules";
import { AI_SETUP_HREF, SIGN_IN_HREF } from "@/shared/routes";

import { applyDraftPatch, type DraftPatch } from "./draft";
import { useSaveOnboarding } from "@/frontend/lib/api/onboarding";
import { ApiError, errorMessageOf } from "@/frontend/lib/errors";
import { clearProgress, readProgress, writeProgress } from "./saved-progress";
import { createSteps } from "./step-factory";

/** The onboarding steps, in order, from the factory. Built once: strategies are stateless. */
const STEPS = createSteps("onboarding");

/**
 * Onboarding's state, and what the flow component can do with it. The
 * component only draws.
 *
 *  - The steps shown are the factory's list minus those that don't apply
 *    (`appliesTo`) — so picking "anywhere in the world" drops work mode.
 *  - `next` moves on only when the current step's `validate` passes;
 *    otherwise its message is shown.
 *  - `goTo` jumps back to edit (from the review), never forward past an
 *    unanswered step.
 *  - `finish` saves (`POST /api/v1/onboarding`, see `lib/api/onboarding`). The
 *    server runs the same rules again; if it refuses (a hand-edited request,
 *    say), the flow goes to the step it named and shows its message there.
 *  - Every answer and the current step are kept in this browser
 *    (`saved-progress.ts`) under `storageKey`, so a refresh resumes where the
 *    user was. Cleared once onboarding is saved.
 */
export function useOnboarding(initial: JobPreferences | undefined, storageKey: string) {
    const router = useRouter();
    const [draft, setDraft] = useState(() => applySearchRules(initial ?? EMPTY_PREFERENCES));
    const [stepId, setStepId] = useState<StepId>(STEPS[0]!.id);
    /** Why the last Continue was refused. */
    const [error, setError] = useState<string | null>(null);
    /** Why the server refused the save, or why it couldn't be reached. */
    const [serverError, setServerError] = useState<string | null>(null);
    const save = useSaveOnboarding();
    /** Set once saved, so the buttons stay disabled while the next page loads. */
    const [leaving, setLeaving] = useState(false);
    /** Bumped on every Continue, so a repeated refusal shakes again instead of sitting still. */
    const [attempt, setAttempt] = useState(0);
    /** The scrolling column; a new step starts at its top. */
    const scroller = useRef<HTMLElement>(null);

    const route = STEPS.filter((step) => step.appliesTo(draft));
    const index = Math.max(0, route.findIndex((step) => step.id === stepId));
    const step = route[index]!;

    // Which way the step changed, so it can slide in from that side. Derived
    // during render (React's "store information from previous renders").
    const [shown, setShown] = useState<{ stepId: StepId; index: number; dir: "forward" | "back" }>({
        stepId,
        index,
        dir: "forward",
    });
    if (shown.stepId !== step.id) {
        setShown({ stepId: step.id, index, dir: index >= shown.index ? "forward" : "back" });
    }

    // A new step starts at its top, whichever element is scrolling.
    useEffect(() => {
        scroller.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
    }, [step.id]);

    /*
     * Resume from this browser's saved answers. The server can't read
     * localStorage, so it renders the first step; this runs right after
     * hydration and before the browser paints, and the flow stays hidden until
     * it has (`ready`), so the wrong step never flashes.
     *
     * Never resumes past an unanswered step: if an earlier step is incomplete
     * (rules changed since, say), it opens on that one instead.
     */
    const [ready, setReady] = useState(false);
    useLayoutEffect(() => {
        const saved = readProgress(storageKey);
        if (saved) {
            const savedRoute = STEPS.filter((s) => s.appliesTo(saved.draft));
            let target = Math.max(0, savedRoute.findIndex((s) => s.id === saved.stepId));
            const firstMissing = savedRoute.findIndex((s) => s.validate(saved.draft) !== null);
            if (firstMissing !== -1 && firstMissing < target) target = firstMissing;

            setDraft(saved.draft);
            setStepId(savedRoute[target]!.id);
        }
        setReady(true);
    }, [storageKey]);

    // Keep every answer and the current step — but only once restored, so the
    // first render's empty draft never overwrites what was saved.
    useEffect(() => {
        if (ready) writeProgress(storageKey, { draft, stepId: step.id });
    }, [ready, storageKey, draft, step.id]);

    // Stable for the page's lifetime (setters never change), so the memoised
    // options in the screens only re-render when their own state does.
    const update = useCallback((patch: DraftPatch) => {
        setError(null);
        setServerError(null);
        setDraft((current) => applyDraftPatch(current, patch));
    }, []);

    function goTo(target: StepId) {
        const targetIndex = route.findIndex((s) => s.id === target);
        if (targetIndex === -1) return;
        const blocked = route.slice(0, targetIndex).some((s) => s.validate(draft) !== null);
        if (blocked) return;
        setError(null);
        setStepId(target);
    }

    function next() {
        setAttempt((n) => n + 1);
        const message = step.validate(draft);
        if (message) {
            setError(message);
            return;
        }
        setError(null);
        const following = route[index + 1];
        if (following) setStepId(following.id);
    }

    function back() {
        const previous = route[index - 1];
        if (!previous) return;
        setError(null);
        setStepId(previous.id);
    }

    function finish() {
        setServerError(null);
        setAttempt((n) => n + 1);
        save.mutate(draft, {
            onSuccess: (result) => {
                if (result.ok) {
                    // Saved on the server now; the browser copy has done its job.
                    clearProgress(storageKey);
                    setLeaving(true);
                    // Next: connecting the AI, the second (required) part of onboarding.
                    router.replace(AI_SETUP_HREF);
                    return;
                }
                goTo(result.stepId);
                setServerError(result.message);
            },
            onError: (error) => {
                if (error instanceof ApiError && error.code === "unauthorized") {
                    // The answers are kept in this browser, so signing back in resumes here.
                    router.push(SIGN_IN_HREF);
                    return;
                }
                // The shared message for whatever went wrong — the same words the backend sent.
                setServerError(errorMessageOf(error));
            },
        });
    }

    const saving = save.isPending || leaving;

    return {
        /** False until saved answers (if any) are restored; the flow hides itself until then. */
        ready,
        draft,
        step,
        index,
        total: route.length,
        route: route.map((s) => s.id),
        isFirst: index === 0,
        isLast: index === route.length - 1,
        error: error ?? serverError,
        attempt,
        direction: shown.dir,
        saving,
        scroller,
        update,
        goTo,
        next,
        back,
        finish,
    };
}
