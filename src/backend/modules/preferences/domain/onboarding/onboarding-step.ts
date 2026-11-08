import type { JobPreferences } from "../job-preferences";

/**
 * One step of onboarding — a State in the State pattern.
 *
 * Each step owns three decisions about itself: what it asks, whether the
 * answers so far satisfy it, and which step comes next. The flow (the State
 * pattern's "context", see `onboarding-flow.ts`) never decides any of these; it
 * only asks the current step. So a branching rule lives with the step it
 * belongs to — "anywhere in the world skips the work-mode question" is in the
 * Location step's `next()`, not in an `if` somewhere in the UI — and adding or
 * reordering a step means writing one object, not editing a switch in three
 * places.
 *
 * Steps are stateless: every method takes the draft and returns an answer. That
 * keeps them shareable between the browser (driving the screens) and the
 * server (re-validating on submit) with no chance of the two disagreeing.
 */

export type StepId = "location" | "workMode" | "titles" | "details" | "review";

export interface OnboardingStep {
    readonly id: StepId;
    /** Short heading for the step indicator. */
    readonly title: string;
    /** One line under the heading, saying why the step is asked. */
    readonly description: string;

    /**
     * What is missing, in words a user can act on — or null when this step is
     * satisfied. Shape is already guaranteed by `applySearchRules`; this is about
     * completeness ("pick at least one country").
     */
    validate(draft: JobPreferences): string | null;

    /** The step that follows, given the answers so far. Null on the last step. */
    next(draft: JobPreferences): StepId | null;
}
