import { titlesRules } from "@/shared/onboarding/steps/titles/rules";

import type { StepStrategy } from "../../orchestrator/step-strategy";
import { TitlesScreen } from "./titles-screen";

/** The roles to search for, plus optional keywords. */
export const titlesStep: StepStrategy = { ...titlesRules, Screen: TitlesScreen };
