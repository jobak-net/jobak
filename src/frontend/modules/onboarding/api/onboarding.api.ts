import {
    ONBOARDING_API_PATH,
    type SaveOnboardingRequest,
    type SaveOnboardingResponse,
} from "@/shared/contracts/onboarding";
import { SETUP_STEPS_API_PATH, type SetupStepId, type SetupStepResult } from "@/shared/contracts/setup-steps";
import { clientFetch, unwrap } from "@/frontend/shared/api";

/*************** Queries ***************/

/** The TanStack Query key for one setup step: the API path, then the step. */
export const setupStepQueryKey = (step: SetupStepId) => [SETUP_STEPS_API_PATH, step] as const;

/**
 * Runs one step of the setup shown before connecting the AI:
 * `GET /api/v1/onboarding/setup-steps/[step]`.
 *
 * Never rejects. A step that can't be reached comes back as skipped, with the
 * shared message for what went wrong, and the setup carries on — nothing here
 * may stand between the user and connecting their AI.
 */
export async function fetchSetupStep(step: SetupStepId): Promise<SetupStepResult> {
    const result = await clientFetch<SetupStepResult>(`${SETUP_STEPS_API_PATH}/${step}`);
    return result.kind === "ok" ? result.data : { ok: false, step, message: result.message };
}

/*************** Mutations ***************/

/**
 * The final onboarding submit: `POST /api/v1/onboarding` with the answers.
 *
 * Resolves with the server's answer — saved, or refused with the step to go
 * back to (a refusal is a normal answer, not an error). Throws an `ApiError`
 * only when there's no answer to act on.
 */
export async function saveOnboarding(draft: SaveOnboardingRequest): Promise<SaveOnboardingResponse> {
    return unwrap(await clientFetch<SaveOnboardingResponse>(ONBOARDING_API_PATH, { method: "POST", body: draft }));
}
