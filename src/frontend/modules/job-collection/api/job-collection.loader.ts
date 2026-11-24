import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";
import { serverFetch } from "@/frontend/shared/api/server";
import { PREFERENCES_API_PATH, type SavedPreferencesResponse } from "@/shared/contracts/preferences";

/**
 * The only Jobak data Find jobs elsewhere needs: the account id (keys the
 * Apify token and history kept in the browser) and the first country in the
 * user's job preferences, to start the search from. Everything else happens
 * between the browser and Apify.
 */
export async function loadJobCollectionPage(): Promise<{ accountId: string; country: string }> {
  const [user, saved] = await Promise.all([requireDashboardUser(), serverFetch<SavedPreferencesResponse>(PREFERENCES_API_PATH)]);
  const country = saved.kind === "ok" ? (saved.data.preferences?.location.countries[0] ?? "") : "";
  return { accountId: user.id, country };
}
