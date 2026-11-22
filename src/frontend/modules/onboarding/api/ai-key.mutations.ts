"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { connectAiKey } from "./ai-key.api";

/**
 * Checks and stores an AI key — onboarding's AI step and Settings. Rejects
 * with an `ApiError` whose `message` is what to show under the field.
 */
export const useConnectAiKey = () => useGenericMutation({ mutationFn: connectAiKey });
