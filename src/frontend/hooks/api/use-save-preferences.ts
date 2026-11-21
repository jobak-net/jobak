"use client";

import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/frontend/lib/api/api-error";
import { clientFetch } from "@/frontend/lib/api/client-fetch";
import {
    PREFERENCES_API_PATH,
    type JobPreferences,
    type PreferencesSaveResult,
} from "@/shared/contracts/preferences";

/**
 * Saves the dashboard's Preferences: `PUT /api/v1/preferences`.
 * Contract: `@/shared/contracts/preferences`.
 *
 * Resolves with the server's answer — saved, or refused with the section to
 * fix (a refusal is a normal answer, not an error). Rejects with an
 * `ApiError` (shared code and message) only when there's no answer to act on.
 */
export function useSavePreferences() {
    return useMutation({
        mutationFn: async (draft: JobPreferences): Promise<PreferencesSaveResult> => {
            const result = await clientFetch<PreferencesSaveResult>(PREFERENCES_API_PATH, {
                method: "PUT",
                body: draft,
            });
            if (result.kind === "ok") return result.data;
            throw ApiError.from(result);
        },
    });
}
