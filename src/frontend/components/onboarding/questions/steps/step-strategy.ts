import type { ReactNode } from "react";

import type { JobField } from "@/shared/contracts/job-catalogue";
import type { JobPreferences } from "@/shared/contracts/preferences";
import type { StepId, StepRules } from "@/shared/onboarding/step-rules";

import type { DraftPatch } from "../draft";

/** What every step's screen is given. Screens only draw and report changes; they hold no rules. */
export interface StepScreenProps {
    draft: JobPreferences;
    update: (patch: DraftPatch) => void;
    goTo: (stepId: StepId) => void;
    catalogue: JobField[];
}

/**
 * One onboarding step — a *strategy*. Every step has the same shape, so the
 * flow treats them all alike: ask `appliesTo` to know whether to show it,
 * `validate` to know whether it's done, and render its `Screen`.
 *
 * The rules come from `@/shared/onboarding/rules/*` (the backend runs the same
 * ones); the screen is added here. One file per step in this folder, and the
 * flow gets them from the factory (`step-factory.ts`), never by importing them
 * one by one.
 */
export interface StepStrategy extends StepRules {
    readonly Screen: (props: StepScreenProps) => ReactNode;
}
