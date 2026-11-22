import "server-only";

import { query, queryOne } from "@/backend/shared/database";
import type { PublicJob, PublicJobCard } from "@/shared/contracts/job-board";

import type { JobBoardFilters, JobBoardRepository } from "../domain/job-board.repository";
import { MENA_COUNTRIES } from "../domain/mena";

/*
 * Who may be seen at all. These pages used to read through Supabase's anon
 * client, where the "Anyone can read active jobs" policy (009_public_jobs.sql)
 * applied this silently. This connection bypasses row-level security, so the
 * same rule is written out here — drop it and inactive or irrelevant jobs
 * would go public.
 */
const VISIBLE = `j.is_active AND j.is_relevant AND j.public_slug IS NOT NULL`;

/*
 * The filters, as one boolean over `jobs j`. Parameters:
 *   $1 workplace TEXT (null = any)   $2 search pattern TEXT (null = none)
 *   $3 category patterns TEXT[]      $4 region TEXT   $5 MENA country codes TEXT[]
 *
 * A search and a category both narrow (ANDed), rather than one replacing the
 * other. Category is matched against the title, because the columns that
 * should hold it (`tech_stack`, `seniority`) are empty on every active row —
 * see `@/shared/job-categories`.
 *
 * Remote roles stay in on the MENA view: a remote listing open to anywhere is
 * available to someone in Cairo, and `region_id` is null on most of them
 * because the collector had no country to attribute. The region is matched on
 * the FK the collector resolved, not re-derived from the location text.
 */
const MATCHES = `${VISIBLE}
  AND ($1::text IS NULL OR j.job_type = $1)
  AND ($2::text IS NULL OR j.title ILIKE $2 OR j.company ILIKE $2)
  AND (cardinality($3::text[]) = 0 OR j.title ILIKE ANY($3::text[]))
  AND CASE $4::text
        WHEN 'mena' THEN j.job_type = 'remote'
                      OR j.region_id IN (SELECT r.id FROM regions r WHERE r.country_code = ANY($5::text[]))
        WHEN 'remote' THEN j.job_type = 'remote'
        ELSE true
      END`;

const CARD_COLUMNS = `j.public_slug, j.title, j.company, j.location, j.job_type, j.salary_text,
       COALESCE(j.posted_at_source, j.created_at) AS posted_at, j.tech_stack, s.display_name AS source`;

interface CardRow {
    public_slug: string;
    title: string;
    company: string;
    location: string | null;
    job_type: string | null;
    salary_text: string | null;
    posted_at: Date | null;
    tech_stack: string[] | null;
    source: string | null;
}

interface JobRow extends CardRow {
    description: string | null;
    apply_url: string | null;
    website: string | null;
    linkedin_url: string | null;
    careers_url: string | null;
}

/** A term as an ILIKE "contains" pattern, with its own `%`, `_` and `\` taken literally. */
function contains(term: string): string {
    return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

function toCard(row: CardRow): PublicJobCard {
    return {
        slug: row.public_slug,
        title: row.title,
        company: row.company,
        location: row.location ?? "",
        workplace: row.job_type === "remote" || row.job_type === "hybrid" ? row.job_type : "onsite",
        salary: row.salary_text || null,
        postedAt: row.posted_at ? new Date(row.posted_at).toISOString() : null,
        source: row.source,
        tags: Array.isArray(row.tech_stack) ? row.tech_stack.slice(0, 6) : [],
    };
}

/**
 * The public board over the app's Postgres connection.
 *
 * Ordered by when *we* collected a job, not by `posted_at_source`: a board
 * that backdates or omits its posting date would otherwise sink to the bottom
 * forever, and "new to Jobak" is what the board claims. The total is an exact
 * count, so the pager agrees with what the next page returns.
 */
export class PgJobBoardRepository implements JobBoardRepository {
    async list(filters: JobBoardFilters, page: { limit: number; offset: number }) {
        const params = [
            filters.workplace === "all" ? null : filters.workplace,
            filters.search ? contains(filters.search) : null,
            filters.categoryKeywords.map(contains),
            filters.region,
            MENA_COUNTRIES,
        ];

        const [rows, count] = await Promise.all([
            query<CardRow>(
                `SELECT ${CARD_COLUMNS}
                   FROM jobs j
                   LEFT JOIN sources s ON s.id = j.source_id
                  WHERE ${MATCHES}
                  ORDER BY j.created_at DESC
                  LIMIT $6 OFFSET $7`,
                [...params, page.limit, page.offset],
            ),
            queryOne<{ total: number }>(`SELECT count(*)::int AS total FROM jobs j WHERE ${MATCHES}`, params),
        ]);

        return { jobs: rows.map(toCard), total: count?.total ?? 0 };
    }

    async findBySlug(slug: string): Promise<PublicJob | null> {
        const row = await queryOne<JobRow>(
            `SELECT ${CARD_COLUMNS}, j.description, j.apply_url, c.website, c.linkedin_url, c.careers_url
               FROM jobs j
               LEFT JOIN sources s ON s.id = j.source_id
               LEFT JOIN companies c ON c.id = j.company_id
              WHERE j.public_slug = $1 AND ${VISIBLE}`,
            [slug],
        );
        if (!row) return null;

        return {
            ...toCard(row),
            description: row.description ?? "",
            applyUrl: row.apply_url ?? "",
            companyWebsite: row.website,
            companyLinkedin: row.linkedin_url,
            companyCareers: row.careers_url,
        };
    }
}
