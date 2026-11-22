"use client";

import { useGenericMutation } from "@/frontend/shared/api";

import { savePreferences } from "./preferences.api";

/** Saves the dashboard's Preferences. Rejects with an `ApiError` (shared code and message). */
export const useSavePreferences = () => useGenericMutation({ mutationFn: savePreferences });
