import "server-only";

import { query } from "@/backend/shared/database";

import type { JobField, JobTitleMatch } from "../domain/job-catalogue";
import type { JobCatalogueRepository } from "../domain/job-catalogue.repository";

/** `ILIKE` treats `%`, `_` and `\` as syntax; a user typing them means the characters. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * `job_fields` / `job_titles` over the app's Postgres connection.
 *
 * Search is plain `ILIKE`, served by the trigram index from migration 022. No
 * pg_trgm function is called at query time, so this works whichever schema
 * the extension was installed into (Supabase's `extensions`, or `public`).
 */
export class PgJobCatalogueRepository implements JobCatalogueRepository {
    async listFields(suggestionsPerField: number): Promise<JobField[]> {
        const rows = await query<{ value: string; label: string; titles: string[] | null }>(
            `SELECT f.value, f.label,
                    (SELECT array_agg(t.title ORDER BY t.sort_order, t.title)
                       FROM (SELECT title, sort_order
                               FROM job_titles
                              WHERE field_value = f.value
                              ORDER BY sort_order, title
                              LIMIT $1) t) AS titles
               FROM job_fields f
              ORDER BY f.sort_order`,
            [suggestionsPerField],
        );
        return rows.map((row) => ({ value: row.value, label: row.label, titles: row.titles ?? [] }));
    }

    async search(words: string[], { field, limit }: { field?: string | null; limit: number }): Promise<JobTitleMatch[]> {
        // $1 phrase as typed (exact match), $2 limit, $3 field or null,
        // $4 phrase escaped (the "starts with" ranks), $5… one escaped word each.
        const phrase = words.join(" ");
        const conditions = words.map((_, i) => `title ILIKE '%' || $${i + 5} || '%'`);

        return query<JobTitleMatch>(
            `SELECT title, field_value AS field
               FROM job_titles
              WHERE ${conditions.join(" AND ")}
                AND ($3::text IS NULL OR field_value = $3)
              ORDER BY lower(title) = lower($1) DESC,
                       title ILIKE $4 || '%' DESC,
                       title ILIKE '% ' || $4 || '%' DESC,
                       sort_order < 1000 DESC,
                       length(title),
                       title
              LIMIT $2`,
            [phrase, limit, field ?? null, escapeLike(phrase), ...words.map(escapeLike)],
        );
    }

    async resolve(titles: string[]): Promise<Map<string, string>> {
        if (titles.length === 0) return new Map();
        const rows = await query<{ title: string }>(
            `SELECT title FROM job_titles WHERE lower(title) = ANY($1::text[])`,
            [titles.map((t) => t.toLowerCase())],
        );
        return new Map(rows.map((row) => [row.title.toLowerCase(), row.title]));
    }
}
