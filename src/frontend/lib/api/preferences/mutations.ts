"use client";

import { useGenericMutation } from "../config";
import { savePreferences } from "./api";

/** Saves the dashboard's Preferences. Rejects with an `ApiError` (shared code and message). */
export const useSavePreferences = () => useGenericMutation({ mutationFn: savePreferences });
