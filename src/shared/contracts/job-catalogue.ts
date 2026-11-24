/**
 * The contract of the job catalogue's routes. Imports nothing (see
 * `src/shared/README.md`).
 *
 * GET /api/v1/job-fields — the fields, each with a few titles to suggest
 *   200  JobField[]
 *   503  { error, code }   couldn't read the catalogue
 *   Not user-specific, so no sign-in is needed.
 *
 * GET /api/v1/job-titles?q=<text>&field=<value> — type-ahead title search
 *   200  JobTitleMatch[]   empty when `q` is shorter than MIN_QUERY_LENGTH
 *   400  { error, code }   `q` missing or too long
 *   401  { error, code }   nobody is signed in (an open search would let
 *                          anyone page through the whole catalogue)
 *   503  { error, code }   couldn't search
 */

export const JOB_FIELDS_API_PATH = "/api/v1/job-fields";
export const JOB_TITLES_API_PATH = "/api/v1/job-titles";

/** The shortest query worth sending: one letter matches a third of the catalogue. */
export const MIN_QUERY_LENGTH = 2;

/** The longest query the search reads; anything past it is a sentence, not a title. */
export const MAX_QUERY_LENGTH = 80;

/** A field, with a handful of its most common titles to suggest. */
export interface JobField {
  /** Stable value persisted to `user_preferences.field`. */
  value: string;
  label: string;
  /** Suggestions only — the first few by catalogue order, not every title. */
  titles: string[];
}

/** One search hit. */
export interface JobTitleMatch {
  title: string;
  /** The field it belongs to (`JobField.value`). */
  field: string;
}
