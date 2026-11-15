/**
 * The contract of `GET /api/v1/job-fields`: the job catalogue's fields, each
 * with a few titles to suggest. Imports nothing (see `../referral-cookie` for
 * the rule of this folder).
 *
 *   200  JobField[]
 *   503  { error }   couldn't read the catalogue
 *
 * Not user-specific, so no sign-in is needed.
 */

export const JOB_FIELDS_API_PATH = "/api/v1/job-fields";

/** A field, with a handful of its most common titles to suggest. */
export interface JobField {
  /** Stable value persisted to `user_preferences.field`. */
  value: string;
  label: string;
  /** Suggestions only — the first few by catalogue order, not every title. */
  titles: string[];
}
