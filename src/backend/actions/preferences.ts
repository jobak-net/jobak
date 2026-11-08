"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/backend/modules/auth/interface";
import { getPreferencesModule, type SaveResult } from "@/backend/modules/preferences";

/**
 * Saves the job preferences from the dashboard's Preferences page.
 *
 * The same checks as finishing onboarding — the search rules, every
 * onboarding step's validation, catalogue-only job titles — but it never
 * touches the onboarding flag. A refusal names the section to fix.
 *
 * `requireUser()` is the authorisation: the user id comes from the session,
 * never from the request.
 */
export async function updatePreferencesAction(draft: unknown): Promise<SaveResult> {
    const user = await requireUser();
    const result = await getPreferencesModule().update.execute(user.id, draft);

    // Matches and the getting-started strip read these preferences.
    if (result.ok) revalidatePath("/dashboard", "layout");
    return result;
}
