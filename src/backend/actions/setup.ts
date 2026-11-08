"use server";

import { requireUser } from "@/backend/modules/auth/interface";
import { getJobSearchModule, type SetupStepResult } from "@/backend/modules/job-search";
import { isSetupStepId } from "@/backend/modules/job-search/domain/setup-steps";

/**
 * Runs one step of the setup screen shown before connecting the AI.
 *
 * The step id comes from the browser, so it is checked against the known
 * steps; everything else — whose preferences, which filters — comes from the
 * session and the database, never from the request.
 */
export async function runSetupStepAction(step: unknown): Promise<SetupStepResult> {
    const user = await requireUser();
    if (!isSetupStepId(step)) return { ok: false, step: "preferences", message: "Unknown setup step." };
    return getJobSearchModule().runSetupStep.execute(user.id, step);
}
