"use client";

import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/frontend/lib/api/api-error";
import { clientFetch } from "@/frontend/lib/api/client-fetch";
import {
    ONBOARDING_API_PATH,
    type SaveOnboardingRequest,
    type SaveOnboardingResponse,
} from "@/shared/contracts/onboarding";

/**
 * The final onboarding submit: `POST /api/v1/onboarding` with the user's
 * answers. Contract: `@/shared/contracts/onboarding`.
 *
 * Resolves with the server's answer — saved, or refused with the step to go
 * back to (a refusal is a normal answer, not an error). Rejects with an
 * `ApiError` (shared code and message) only when there's no answer to act on.
 */
export function useSaveOnboarding() {
    return useMutation({
        mutationFn: async (draft: SaveOnboardingRequest): Promise<SaveOnboardingResponse> => {
            const result = await clientFetch<SaveOnboardingResponse>(ONBOARDING_API_PATH, {
                method: "POST",
                body: draft,
            });
            if (result.kind === "ok") return result.data;
            throw ApiError.from(result);
        },
    });
}
