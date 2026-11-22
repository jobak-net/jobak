"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { saveOnboarding } from "./onboarding.api";

/** Finishes onboarding. Rejects with an `ApiError` (shared code and message). */
export const useSaveOnboarding = () => useGenericMutation({ mutationFn: saveOnboarding });
