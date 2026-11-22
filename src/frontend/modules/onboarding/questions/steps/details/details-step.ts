import { detailsRules } from "@/shared/onboarding/steps/details/rules";

import type { StepStrategy } from "../../orchestrator/step-strategy";
import { DetailsScreen } from "./details-screen";

/** Contract type and seniority. Both optional. */
export const detailsStep: StepStrategy = { ...detailsRules, Screen: DetailsScreen };
