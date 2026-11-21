import { PREFERENCES_API_PATH, type JobPreferences, type PreferencesSaveResult } from "@/shared/contracts/preferences";

import { clientFetch } from "../client-fetch";
import { unwrap } from "../config";

/*************** Mutations ***************/

/**
 * Saves the dashboard's Preferences: `PUT /api/v1/preferences`.
 *
 * Resolves with the server's answer — saved, or refused with the section to
 * fix (a refusal is a normal answer, not an error). Throws an `ApiError` only
 * when there's no answer to act on.
 */
export async function savePreferences(draft: JobPreferences): Promise<PreferencesSaveResult> {
    return unwrap(await clientFetch<PreferencesSaveResult>(PREFERENCES_API_PATH, { method: "PUT", body: draft }));
}
