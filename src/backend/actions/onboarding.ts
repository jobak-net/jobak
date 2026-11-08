"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/backend/modules/auth/interface";
import { getPreferencesModule, type SaveResult } from "@/backend/modules/preferences";

/**
 * Finishes onboarding: saves the answers and sets the flag.
 *
 * The browser's draft is untrusted input, so this does not save it as sent —
 * the use case parses it, applies the search rules (worldwide means remote
 * only, MENA countries only) and re-runs every onboarding step's validation.
 * A refusal names the step to go back to, which the form then shows.
 *
 * `requireUser()` is the authorisation: the user id comes from the session,
 * never from the request, so nobody can save preferences for someone else.
 */
export async function completeOnboardingAction(draft: unknown): Promise<SaveResult> {
    const user = await requireUser();
    const result = await getPreferencesModule().completeOnboarding.execute(user.id, draft);

    // The dashboard reads these preferences (matches, the getting-started strip).
    if (result.ok) revalidatePath("/dashboard", "layout");
    return result;
}
