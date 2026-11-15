/**
 * The contract of `GET /api/v1/preferences`: what the signed-in user wants the
 * job search to look for. Imports only other contracts (see `../referral-cookie`
 * for the rule of this folder).
 *
 *   200  SavedPreferencesResponse   `preferences` is null until they've saved any
 *   401  { error }                  nobody is signed in
 *   503  { error }                  couldn't read them
 *
 * The rules that make a submission valid (`applySearchRules`, the MENA country
 * list, the caps) stay in the backend's preferences domain; this is only the
 * shape both sides agree on.
 */

import type { JobType } from "./jobs";

export type { JobType };

export const PREFERENCES_API_PATH = "/api/v1/preferences";

export type WorkMode = "remote" | "hybrid" | "on-site";
export type Seniority = "entry" | "mid" | "senior" | "lead";

export interface LocationPreference {
  /**
   * "Anywhere in the world". Implies remote-only and no countries — see
   * `applySearchRules`. A flag of its own rather than an empty country list,
   * so "not answered yet" stays distinct from "anywhere is fine".
   */
  worldwide: boolean;
  /** MENA country codes. Empty when `worldwide`. */
  countries: string[];
}

/**
 * What a user wants the job search to look for — the answers onboarding
 * collects and the dashboard's Preferences page edits.
 *
 * Only the fields that narrow a search live here. API keys, the public profile
 * and marketing answers have their own homes; mixing them in is how a
 * "preferences" object ends up carrying secrets to places that only needed a
 * country list.
 */
export interface JobPreferences {
  location: LocationPreference;
  workModes: WorkMode[];
  /** Titles, from the job catalogue or typed by the user. */
  jobTitles: string[];
  /** Skills, tools or domains to look for in postings. */
  keywords: string[];
  jobTypes: JobType[];
  seniority: Seniority | null;
  /** The catalogue field the titles were picked from, if any. */
  field: string | null;
}

export interface SavedPreferencesResponse {
  preferences: JobPreferences | null;
}
