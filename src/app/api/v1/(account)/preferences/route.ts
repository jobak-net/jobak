import { revalidatePath } from "next/cache";

import { getPreferencesModule } from "@/backend/modules/preferences";
import { jobPreferenceSchema } from "@/backend/modules/preferences/validation/job-preference-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { PreferencesSaveResult, SavedPreferencesResponse } from "@/shared/contracts/preferences";

/**
 * /api/v1/preferences — the signed-in user's search preferences.
 * Contract: `@/shared/contracts/preferences`.
 */
export const dynamic = "force-dynamic";

/** GET — the saved preferences, or `null` until they've saved any. */
export const GET = withMiddlewares(
  { label: "preferences.get", auth: "required" },
  async ({ user }): Promise<SavedPreferencesResponse> => {
    const stored = await getPreferencesModule().get.execute(user.id);
    // Only the contract's fields: `onboardingCompleted` is `GET /api/v1/me`'s to answer.
    return {
      preferences: stored && {
        location: stored.location,
        workModes: stored.workModes,
        jobTitles: stored.jobTitles,
        keywords: stored.keywords,
        jobTypes: stored.jobTypes,
        seniority: stored.seniority,
        field: stored.field,
      },
    };
  },
);

/**
 * PUT — saves them, from the dashboard's Preferences page. The same checks as
 * finishing onboarding — the search rules, every step's rules, catalogue-only
 * job titles — but it never touches the onboarding flag.
 */
export const PUT = withMiddlewares(
  { label: "preferences.update", auth: "required", body: jobPreferenceSchema },
  async ({ user, body }): Promise<PreferencesSaveResult> => {
    const result = await getPreferencesModule().update.execute(user.id, body);
    // Matches and the getting-started strip read these preferences.
    if (result.ok) revalidatePath("/dashboard", "layout");
    return result;
  },
);
