import { workModeRules } from "@/shared/onboarding/steps/work-mode/rules";

import type { StepStrategy } from "../../orchestrator/step-strategy";
import { WorkModeScreen } from "./work-mode-screen";

/** Remote, hybrid, on-site. Not asked for "anywhere in the world" (see its `appliesTo`). */
export const workModeStep: StepStrategy = { ...workModeRules, Screen: WorkModeScreen };
