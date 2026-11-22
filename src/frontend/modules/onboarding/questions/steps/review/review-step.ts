import { reviewRules } from "@/shared/onboarding/steps/review/rules";

import type { StepStrategy } from "../../orchestrator/step-strategy";
import { ReviewScreen } from "./review-screen";

/** The answers, read back with an edit link per row. The last step. */
export const reviewStep: StepStrategy = { ...reviewRules, Screen: ReviewScreen };
