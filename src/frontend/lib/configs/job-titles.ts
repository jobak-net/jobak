/**
 * The shape of the job title catalogue, and the pure helpers that read it.
 *
 * The catalogue itself lives in the `job_fields` and `job_titles` tables (see
 * `db/supabase/004_job_catalogue.sql` and `022_job_title_catalogue.sql`), read
 * through the `job-catalogue` module. Fetch the fields server-side with
 * `getJobCatalogueModule().listFields.execute()` and pass them down; a field's
 * `titles` are its first few suggestions, not every title — the rest is
 * reached through `searchJobTitlesAction`.
 */

import type { JobField } from "@/backend/modules/job-catalogue/domain/job-catalogue";

export type { JobField };

/** The suggested titles for a field, or nothing when the field is unknown. */
export function titlesForField(catalogue: JobField[], field: string): string[] {
    return catalogue.find((f) => f.value === field)?.titles ?? [];
}

/**
 * Display name for a stored field value.
 *
 * Falls back to the raw value so a field retired from the catalogue still reads
 * as something rather than blank on a profile that selected it.
 */
export function fieldLabel(catalogue: JobField[], value: string): string {
    return catalogue.find((f) => f.value === value)?.label ?? value;
}
