import { clientFetch } from "@/frontend/lib/api/client-fetch";
import { SETUP_STEPS_API_PATH, type SetupStepId, type SetupStepResult } from "@/shared/contracts/setup-steps";

/** The TanStack Query key for one setup step: the API path, then the step. */
export const setupStepQueryKey = (step: SetupStepId) => [SETUP_STEPS_API_PATH, step] as const;

/**
 * Runs one setup step: `GET /api/v1/onboarding/setup-steps/[step]`.
 *
 * Never rejects. A step that can't be reached is shown as skipped and the
 * setup carries on — nothing here may stand between the user and connecting
 * their AI.
 */
export async function fetchSetupStep(step: SetupStepId): Promise<SetupStepResult> {
    const result = await clientFetch<SetupStepResult>(`${SETUP_STEPS_API_PATH}/${step}`);
    // A failed step shows the shared message for what went wrong — the same words the backend sent.
    return result.kind === "ok" ? result.data : { ok: false, step, message: result.message };
}
