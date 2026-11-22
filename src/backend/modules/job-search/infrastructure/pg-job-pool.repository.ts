import "server-only";

import { query } from "@/backend/shared/database";

import type { JobPoolRepository, PoolFilter, PoolJob, UserMatch } from "../domain/job-pool.repository";

interface PoolRow {
    id: string;
    title: string;
    company: string;
    location: string | null;
    job_type: string | null;
    description: string | null;
    tech_stack: string[] | null;
    salary_text: string | null;
    apply_url: string;
    posted_at: Date | null;
    source: string | null;
}

interface MatchRow {
    job_id: string;
    score: number | null;
    scored_at: Date | null;
    is_bookmarked: boolean | null;
    match_reason: string | null;
    tech_stack: string[] | null;
}

/**
 * The pool and the user's matches, over the app's Postgres connection.
 *
 * The pool is shared and the matches are per user, so the matches are always
 * scoped by the verified `userId`; nothing here takes an id from a request.
 */
export class PgJobPoolRepository implements JobPoolRepository {
    async pool({ workplaces, countries, limit }: PoolFilter): Promise<PoolJob[]> {
        const rows = await query<PoolRow>(
            `SELECT j.id, j.title, j.company, j.location, j.job_type, j.description, j.tech_stack,
                    j.salary_text, j.apply_url, COALESCE(j.posted_at_source, j.created_at) AS posted_at,
                    s.display_name AS source
               FROM jobs j
               LEFT JOIN sources s ON s.id = j.source_id
              WHERE j.is_active
                AND (cardinality($1::text[]) = 0 OR j.job_type = ANY($1::text[]))
                AND (cardinality($2::text[]) = 0
                     OR j.region_id IS NULL
                     OR j.region_id IN (SELECT r.id FROM regions r WHERE r.country_code = ANY($2::text[])))
              ORDER BY j.posted_at_source DESC NULLS LAST
              LIMIT $3`,
            [workplaces, countries, limit],
        );

        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            company: row.company,
            location: row.location,
            jobType: row.job_type,
            description: row.description,
            techStack: row.tech_stack ?? [],
            salary: row.salary_text,
            applyUrl: row.apply_url,
            postedAt: row.posted_at ? new Date(row.posted_at).toISOString() : null,
            source: row.source,
        }));
    }

    async matches(userId: string): Promise<UserMatch[]> {
        const rows = await query<MatchRow>(
            `SELECT job_id, score, scored_at, is_bookmarked, match_reason, tech_stack
               FROM user_job_matches
              WHERE user_id = $1`,
            [userId],
        );

        return rows.map((row) => ({
            jobId: row.job_id,
            /*
             * `scored_at` separates "the model rated this 12" from "nothing has
             * looked at this yet". Both used to arrive as score 0, so an unscored
             * job was indistinguishable from a terrible match.
             */
            score: row.scored_at ? (row.score ?? 0) : null,
            bookmarked: row.is_bookmarked ?? false,
            reason: row.match_reason,
            techStack: row.tech_stack ?? [],
        }));
    }
}
