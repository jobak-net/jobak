"use client";

import { useGenericMutation } from "../config";
import { saveOnboarding } from "./api";

/** Finishes onboarding. Rejects with an `ApiError` (shared code and message). */
export const useSaveOnboarding = () => useGenericMutation({ mutationFn: saveOnboarding });
