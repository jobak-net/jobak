"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { removeAiKey, setAiModel, setPreferredAiProvider } from "./ai-settings.api";

/** Picks one provider's model. Rejects with an `ApiError` (shared code and message). */
export const useSetAiModel = () => useGenericMutation({ mutationFn: setAiModel });

/** Forgets one provider's key. */
export const useRemoveAiKey = () => useGenericMutation({ mutationFn: removeAiKey });

/** Switches the AI tools to another saved key. */
export const useSetPreferredAiProvider = () => useGenericMutation({ mutationFn: setPreferredAiProvider });
