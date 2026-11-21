// hooks
export { useSaveOnboarding } from "./mutations";

// functions
export { fetchSetupStep, saveOnboarding, setupStepQueryKey } from "./api";

// types — the shared contracts
export type { SaveOnboardingRequest, SaveOnboardingResponse } from "@/shared/contracts/onboarding";
export type { SetupStepId, SetupStepResult } from "@/shared/contracts/setup-steps";
