import type { StepId } from "@/shared/onboarding/step-rules";
import { STEP_ORDER } from "@/shared/onboarding/steps";

import { detailsStep } from "./details";
import { locationStep } from "./location";
import { reviewStep } from "./review";
import type { StepStrategy } from "./step-strategy";
import { titlesStep } from "./titles";
import { workModeStep } from "./work-mode";

/**
 * The step factory: the one place that builds the step strategies a screen
 * uses. Callers say what they're building for and get the steps in order; they
 * never import the step files themselves.
 *
 *     createSteps("onboarding")   all five, for the onboarding flow
 *     createSteps("settings")     without the review step, for the
 *                                 dashboard's Preferences page
 *     createStep(id)              one step, by id
 *
 * The order is the shared `STEP_ORDER`, so the browser and the backend never
 * disagree about it.
 */

export type StepsContext = "onboarding" | "settings";

const STRATEGIES: Readonly<Record<StepId, StepStrategy>> = {
    location: locationStep,
    workMode: workModeStep,
    titles: titlesStep,
    details: detailsStep,
    review: reviewStep,
};

export function createStep(id: StepId): StepStrategy {
    return STRATEGIES[id];
}

export function createSteps(context: StepsContext): StepStrategy[] {
    const steps = STEP_ORDER.map((rules) => STRATEGIES[rules.id]);
    // The review step reads the answers back before the first save; a settings
    // page shows the answers already, so it has no place there.
    return context === "settings" ? steps.filter((step) => step.id !== "review") : steps;
}
