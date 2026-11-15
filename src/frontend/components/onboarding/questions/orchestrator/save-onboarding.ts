"use client";

import { useMutation } from "@tanstack/react-query";

import { clientFetch } from "@/frontend/lib/api/client-fetch";
import {
    ONBOARDING_API_PATH,
    type SaveOnboardingRequest,
    type SaveOnboardingResponse,
} from "@/shared/contracts/onboarding";

/**
 * The final submit: `POST /api/v1/onboarding` with the user's answers.
 * Contract: `@/shared/contracts/onboarding`.
 *
 * Resolves with the server's answer — saved, or refused with the step to go
 * back to (a refusal is a normal answer, not an error). Rejects with a
 * `SaveOnboardingError` only when there's no answer to act on.
 */
export function useSaveOnboarding() {
    return useMutation({
        mutationFn: async (draft: SaveOnboardingRequest): Promise<SaveOnboardingResponse> => {
            const result = await clientFetch<SaveOnboardingResponse>(ONBOARDING_API_PATH, {
                method: "POST",
                body: draft,
            });
            if (result.kind === "ok") return result.data;
            throw new SaveOnboardingError(result.kind === "unauthorized" ? "signed-out" : "unavailable");
        },
    });
}

export class SaveOnboardingError extends Error {
    constructor(
        /** `signed-out`: the session ended. `unavailable`: the server couldn't be reached or failed. */
        readonly reason: "signed-out" | "unavailable",
    ) {
        super(reason === "signed-out" ? "The session ended" : "Could not save the answers");
        this.name = "SaveOnboardingError";
    }
}
