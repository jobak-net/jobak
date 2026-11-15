import type { JobPreferences } from "@/shared/contracts/preferences";

import { detailsRules } from "./rules/details";
import { locationRules } from "./rules/location";
import { reviewRules } from "./rules/review";
import { titlesRules } from "./rules/titles";
import { workModeRules } from "./rules/work-mode";
import type { StepId, StepRules } from "./step-rules";

/**
 * The onboarding steps, in the order a user meets them — and the two questions
 * asked of all of them together. Only the questions that narrow a job search
 * are asked; everything else waits for the dashboard.
 *
 *     location ─▶ workMode ─▶ titles ─▶ details ─▶ review
 *                 (skipped for "anywhere in the world")
 */

/** Every step, in order. The single source of the order, for both sides. */
export const STEP_ORDER: readonly StepRules[] = [locationRules, workModeRules, titlesRules, detailsRules, reviewRules];

/** The steps this user will actually see: the order, minus those that don't apply. */
export function routeFor(draft: JobPreferences): StepId[] {
  return STEP_ORDER.filter((step) => step.appliesTo(draft)).map((step) => step.id);
}

/**
 * The first step on the route that is not satisfied, with what it needs — or
 * null when everything required has been answered.
 *
 * What the backend runs before marking onboarding complete: the same rules the
 * browser used, so a hand-crafted request cannot complete onboarding with a
 * step the UI would have refused.
 */
export function validateForCompletion(draft: JobPreferences): { stepId: StepId; message: string } | null {
  for (const step of STEP_ORDER) {
    if (!step.appliesTo(draft)) continue;
    const message = step.validate(draft);
    if (message) return { stepId: step.id, message };
  }
  return null;
}
