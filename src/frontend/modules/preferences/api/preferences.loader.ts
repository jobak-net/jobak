import "server-only";

import { redirect } from "next/navigation";

import { ApiError } from "@/frontend/shared/api";
import { serverFetch } from "@/frontend/shared/api/server";
import { JOB_FIELDS_API_PATH, type JobField } from "@/shared/contracts/job-catalogue";
import {
  PREFERENCES_API_PATH,
  type JobPreferences,
  type SavedPreferencesResponse,
} from "@/shared/contracts/preferences";
import { SIGN_IN_HREF } from "@/shared/routes";

/**
 * What /dashboard/preferences renders with: the saved preferences
 * (`GET /api/v1/preferences`) and the job fields for the titles section's
 * suggestions (`GET /api/v1/job-fields`).
 *
 * A failure to read the preferences throws, to the dashboard's error boundary,
 * rather than opening an empty form, which a save would then use to overwrite
 * what is really there. The fields are a convenience — search works without
 * them — so a failed read just leaves them out (`serverFetch` logs it).
 */
export async function loadPreferencesForm(): Promise<{
  initial: JobPreferences | null;
  catalogue: JobField[];
}> {
  const [saved, fields] = await Promise.all([
    serverFetch<SavedPreferencesResponse>(PREFERENCES_API_PATH),
    serverFetch<JobField[]>(JOB_FIELDS_API_PATH),
  ]);

  if (saved.kind === "unauthorized") redirect(SIGN_IN_HREF);
  if (saved.kind === "failed") throw ApiError.from(saved);

  return {
    initial: saved.data.preferences,
    catalogue: fields.kind === "ok" ? fields.data : [],
  };
}
