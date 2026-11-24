/**
 * Onboarding: the job questions (`questions/`), connecting an AI (`ai/`), and
 * what both share (`shared/`). Guards and loaders are in `./server`.
 *
 * It owns the step engine — the questions, the draft, the search preview — and
 * the AI connection screens. The preferences page and the settings page reuse
 * them through this file, which is why it exports more than its own pages need.
 */
export { useConnectAiKey } from "./api/ai-key.mutations";
export { AiProviderMark } from "./ai/ai-provider-marks";
export { AiSetupFlow } from "./ai/orchestrator/ai-setup-flow";
export { ConnectionPanel, type ConnectionStatus } from "./ai/orchestrator/connection-panel";
export { ChooseScreen } from "./ai/phases/choose-provider/choose-provider-screen";
export { KEY_FORM_ID, KeyScreen } from "./ai/phases/key/key-screen";
export { checkKeyFormat } from "./ai/provider-keys";
export { PROVIDER_INFO, PROVIDER_ORDER } from "./ai/providers";
export { type DraftPatch, applyDraftPatch } from "./questions/orchestrator/draft";
export { OnboardingFlow } from "./questions/orchestrator/onboarding-flow";
export { createStep, createSteps } from "./questions/orchestrator/step-factory";
export { WORK_MODE_LABEL } from "./shared/labels";
export { SearchPreview } from "./shared/search-preview";
export { type AiProvider } from "./types/onboarding.types";
