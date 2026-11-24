import { locationRules } from "@/shared/onboarding/steps/location/rules";

import type { StepStrategy } from "../../orchestrator/step-strategy";
import { LocationScreen } from "./location-screen";

/** Where the user wants to work. */
export const locationStep: StepStrategy = { ...locationRules, Screen: LocationScreen };
