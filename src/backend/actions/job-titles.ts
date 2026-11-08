"use server";

import { requireUser } from "@/backend/modules/auth/interface";
import { getJobCatalogueModule, type JobTitleMatch } from "@/backend/modules/job-catalogue";

/**
 * Type-ahead search over the job title catalogue, for the onboarding and
 * preferences forms.
 *
 * Signed-in only. The catalogue is not secret, but an open search endpoint is
 * an invitation to page through the whole table one request at a time.
 *
 * Both arguments come from the browser, so they are checked for type here;
 * the use case trims, caps the length and ignores queries too short to be
 * useful. A failure returns no results rather than throwing — the dropdown
 * shows "no matches" and the user can type again.
 */
export async function searchJobTitlesAction(query: unknown, field?: unknown): Promise<JobTitleMatch[]> {
    await requireUser();
    if (typeof query !== "string") return [];

    try {
        return await getJobCatalogueModule().search.execute(query, typeof field === "string" ? field : null);
    } catch (error) {
        console.error("[job-titles] search failed", error);
        return [];
    }
}
