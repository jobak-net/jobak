import { applySearchRules, EMPTY_PREFERENCES, type JobPreferences } from "../job-preferences";
import type { StepId } from "./onboarding-step";
import { FIRST_STEP, STEPS } from "./steps";

/**
 * The onboarding flow — the "context" of the State pattern.
 *
 * It holds where the user is and what they have answered, and moves between
 * steps by asking the current step (`validate`, `next`). It makes no routing
 * decisions of its own, which is the point: the steps own the rules.
 *
 * Written as a reducer — `(state, action) → state`, no mutation — so the UI can
 * drive it with React's `useReducer` and the server can replay the same logic
 * without React at all.
 */

export interface OnboardingState {
    stepId: StepId;
    draft: JobPreferences;
    /** Why the last "next" was refused, shown under the current step. */
    error: string | null;
}

/**
 * A change to the draft: the fields to set, or a pure function of the current
 * draft that returns them. The function form lets the UI hand out handlers
 * that never change (a toggle reads the list it toggles from the state, not
 * from a closure), so unchanged options can skip re-rendering.
 */
export type DraftPatch = Partial<JobPreferences> | ((draft: JobPreferences) => Partial<JobPreferences>);

export type OnboardingAction =
    | { type: "update"; patch: DraftPatch }
    | { type: "next" }
    | { type: "back" }
    | { type: "goTo"; stepId: StepId };

/**
 * The steps this user will actually see, in order — found by following each
 * step's `next()` from the first. It changes with the answers: choosing
 * anywhere in the world drops the work-mode step from the route.
 */
export function routeFor(draft: JobPreferences): StepId[] {
    const route: StepId[] = [];
    let current: StepId | null = FIRST_STEP;
    // Bounded by the number of steps, so a mis-wired `next()` cannot loop forever.
    while (current && !route.includes(current) && route.length < Object.keys(STEPS).length) {
        route.push(current);
        current = STEPS[current].next(draft);
    }
    return route;
}

/**
 * The first step on the route that is not satisfied, with what it needs — or
 * null when everything required has been answered.
 *
 * What the server runs before marking onboarding complete: the same step
 * objects the browser used, so a hand-crafted request cannot complete
 * onboarding with a step the UI would have refused.
 */
export function validateForCompletion(draft: JobPreferences): { stepId: StepId; message: string } | null {
    for (const stepId of routeFor(draft)) {
        const message = STEPS[stepId].validate(draft);
        if (message) return { stepId, message };
    }
    return null;
}

/**
 * Applies a change to a draft. Every change goes through the search rules, so
 * the draft is always valid in shape — ticking "anywhere" immediately becomes
 * remote-only. Shared by the onboarding flow and the dashboard's preferences
 * page, so both edit answers by exactly the same rules.
 */
export function applyDraftPatch(draft: JobPreferences, patch: DraftPatch): JobPreferences {
    const fields = typeof patch === "function" ? patch(draft) : patch;
    return applySearchRules({ ...draft, ...fields });
}

export function initialOnboardingState(draft: JobPreferences = EMPTY_PREFERENCES): OnboardingState {
    return { stepId: FIRST_STEP, draft: applySearchRules(draft), error: null };
}

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
    switch (action.type) {
        case "update":
            return { ...state, draft: applyDraftPatch(state.draft, action.patch), error: null };

        case "next": {
            const step = STEPS[state.stepId];
            const error = step.validate(state.draft);
            if (error) return { ...state, error };

            const next = step.next(state.draft);
            return next ? { ...state, stepId: next, error: null } : state;
        }

        case "back": {
            const route = routeFor(state.draft);
            const index = route.indexOf(state.stepId);
            return index > 0 ? { ...state, stepId: route[index - 1]!, error: null } : state;
        }

        case "goTo": {
            // Jump only to a step on the route whose earlier steps are all done:
            // back to edit from the review, never forward past an unanswered step.
            const route = routeFor(state.draft);
            const target = route.indexOf(action.stepId);
            if (target === -1) return state;
            const blocked = route.slice(0, target).some((id) => STEPS[id].validate(state.draft) !== null);
            return blocked ? state : { ...state, stepId: action.stepId, error: null };
        }
    }
}

/** Position on the route, for a progress indicator. */
export function progressOf(state: OnboardingState): { index: number; total: number; route: StepId[] } {
    const route = routeFor(state.draft);
    return { index: Math.max(0, route.indexOf(state.stepId)), total: route.length, route };
}
