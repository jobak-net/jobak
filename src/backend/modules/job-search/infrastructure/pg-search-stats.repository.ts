import "server-only";

import { query, queryOne } from "@/backend/shared/database";

import type { SearchStatsRepository } from "../domain/search-stats.repository";
import type { SearchCriteria, SearchStepData, SourcesStepData } from "../domain/setup-steps";

/*
 * Each filter as a boolean over `jobs j`, written to match
 * `match_candidate_jobs` (012) line for line. Parameters:
 *   $1 titles TEXT[]   $2 countries TEXT[]   $3 worldwide BOOLEAN   $4 job types TEXT[]
 */
const TITLE_OK = `(cardinality($1::text[]) = 0 OR EXISTS (
    SELECT 1 FROM unnest($1::text[]) AS t
    WHERE j.title ILIKE '%' || t || '%' OR t ILIKE '%' || j.title || '%'))`;

// Remote jobs and jobs with no known region pass, as in the matcher: the
// remote-first boards rarely say where a job is, and dropping them here would
// hide listings the dashboard does show.
const LOCATION_OK = `($3::boolean OR cardinality($2::text[]) = 0 OR j.job_type = 'remote' OR j.region_id IS NULL
    OR EXISTS (SELECT 1 FROM regions r WHERE r.id = j.region_id AND r.country_code = ANY($2::text[])))`;

const WORK_OK = `(cardinality($4::text[]) = 0 OR j.job_type = ANY($4::text[]))`;

const params = (c: SearchCriteria) => [c.titles, c.countries, c.worldwide, c.jobTypes];

/**
 * The setup's counts, over the app's Postgres connection.
 *
 * One pass over `jobs` per step: the funnel is four FILTERed counts of the
 * same scan, not four queries, so it costs about what one count does.
 */
export class PgSearchStatsRepository implements SearchStatsRepository {
    async funnel(criteria: SearchCriteria): Promise<SearchStepData> {
        const row = await queryOne<{ total: number; titles: number; located: number; matching: number }>(
            `SELECT count(*)::int AS total,
                    count(*) FILTER (WHERE t_ok)::int AS titles,
                    count(*) FILTER (WHERE t_ok AND l_ok)::int AS located,
                    count(*) FILTER (WHERE t_ok AND l_ok AND w_ok)::int AS matching
               FROM (SELECT ${TITLE_OK} AS t_ok, ${LOCATION_OK} AS l_ok, ${WORK_OK} AS w_ok
                       FROM jobs j
                      WHERE j.is_active AND j.is_relevant) AS flags`,
            params(criteria),
        );
        return {
            total: row?.total ?? 0,
            matchingTitles: row?.titles ?? 0,
            inLocations: row?.located ?? 0,
            matching: row?.matching ?? 0,
        };
    }

    async sources(criteria: SearchCriteria): Promise<SourcesStepData> {
        const [active, withJobs, newest] = await Promise.all([
            queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM sources WHERE is_active IS NOT FALSE`),
            query<{ name: string; jobs: number }>(
                `SELECT s.display_name AS name, count(*)::int AS jobs
                   FROM jobs j
                   JOIN sources s ON s.id = j.source_id
                  WHERE j.is_active AND j.is_relevant AND ${TITLE_OK} AND ${LOCATION_OK} AND ${WORK_OK}
                  GROUP BY s.display_name
                  ORDER BY jobs DESC, s.display_name
                  LIMIT 6`,
                params(criteria),
            ),
            queryOne<{ newest: Date | null }>(
                `SELECT max(j.scraped_at) AS newest
                   FROM jobs j
                  WHERE j.is_active AND j.is_relevant AND ${TITLE_OK} AND ${LOCATION_OK} AND ${WORK_OK}`,
                params(criteria),
            ),
        ]);

        return {
            active: active?.n ?? 0,
            withJobs,
            newestAt: newest?.newest ? new Date(newest.newest).toISOString() : null,
        };
    }
}
