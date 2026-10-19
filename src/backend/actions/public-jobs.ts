import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { categoryKeywords } from "@/frontend/lib/configs/job-categories";
import { createClient } from "@/backend/lib/supabase/server";
import { sanitizeDescription } from "@/backend/lib/html/sanitize-description";
import { logServerError } from "@/backend/lib/errors";

/**
 * The job pool, as anyone may see it.
 *
 * Reads with the ordinary anon client, not the service role. That is the point:
 * the "Anyone can read active jobs" policy in `db/supabase/009_public_jobs.sql` is what
 * makes these pages work, so if that policy were ever tightened these pages
 * would go empty rather than quietly keep serving data past a permission change.
 *
 * `user_job_matches` is never touched here. Scores, bookmarks and who-was-shown-
 * what stay per-user and private; a public visitor sees the listing and nothing
 * about anyone's relationship to it.
 */

export interface PublicJob {
  slug: string;
  title: string;
  company: string;
  location: string;
  workplace: "remote" | "onsite" | "hybrid";
  salary: string | null;
  postedAt: string | null;
  /** Sanitised HTML — safe to render. */
  description: string;
  applyUrl: string;
  source: string | null;
  tags: string[];
  companyWebsite: string | null;
  companyLinkedin: string | null;
  companyCareers: string | null;
}

/** Card-sized subset, for the index. */
export type PublicJobCard = Pick<
  PublicJob,
  "slug" | "title" | "company" | "location" | "workplace" | "salary" | "postedAt" | "source" | "tags"
>;

const CARD_COLUMNS =
  "public_slug, title, company, location, job_type, salary_text, posted_at_source, created_at, tech_stack, sources(display_name)";

const FULL_COLUMNS = `${CARD_COLUMNS}, description, apply_url, companies(website, linkedin_url, careers_url)`;

interface Row {
  public_slug: string | null;
  title: string;
  company: string;
  location: string | null;
  job_type: string | null;
  salary_text: string | null;
  posted_at_source: string | null;
  created_at: string;
  tech_stack: string[] | null;
  description?: string | null;
  apply_url?: string;
  sources?: { display_name: string } | { display_name: string }[] | null;
  companies?:
    | { website: string | null; linkedin_url: string | null; careers_url: string | null }
    | { website: string | null; linkedin_url: string | null; careers_url: string | null }[]
    | null;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** PostgREST returns an embedded to-one as an object or a one-element array depending on the hint. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toWorkplace(raw: string | null): PublicJob["workplace"] {
  return raw === "remote" || raw === "hybrid" ? raw : "onsite";
}

function toCard(row: Row): PublicJobCard {
  return {
    slug: row.public_slug ?? "",
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    workplace: toWorkplace(row.job_type),
    salary: row.salary_text || null,
    postedAt: row.posted_at_source ?? row.created_at,
    source: one(row.sources)?.display_name ?? null,
    tags: Array.isArray(row.tech_stack) ? row.tech_stack.slice(0, 6) : [],
  };
}

/**
 * The markets this product is for.
 *
 * Jobak exists for candidates in MENA, and the public jobs page was showing the
 * pool in pure recency order — which on a busy collection day is a wall of
 * remote-worldwide listings with Cairo and Riyadh buried underneath. These
 * codes drive both the default ordering and the region filter.
 */
export const MENA_COUNTRIES = [
  "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ",
  "MA", "TN", "DZ", "LY", "SD", "PS", "SY", "YE", "MR", "SO", "DJ", "KM",
];

export type RegionFilter = "mena" | "remote" | "all";
export type WorkplaceFilter = "all" | "remote" | "hybrid" | "onsite";

export interface JobQuery {
  region?: RegionFilter;
  workplace?: WorkplaceFilter;
  search?: string;
  /** A value from JOB_CATEGORIES, or "all". */
  category?: string;
  /** Page size. */
  limit?: number;
  /** 1-based. Out-of-range pages come back empty rather than clamped. */
  page?: number;
}

export interface JobPage {
  jobs: PublicJobCard[];
  /** Matching rows across every page, for the pager. */
  total: number;
}

/**
 * Escapes a term for a PostgREST `or(...)` filter.
 *
 * Commas separate the conditions and parentheses group them, so a title
 * containing either — "Mobile Engineer (iOS)", "Data Analyst / Scientist,
 * Remote" — would otherwise be read as syntax rather than as a value.
 */
const escapeTerm = (term: string) => term.replace(/[,()]/g, " ").trim();

/**
 * The listings for `/jobs`.
 *
 * Ordered by when *we* collected it rather than by `posted_at_source`: a board
 * that backdates or omits its posting date would otherwise sink to the bottom
 * forever, and "new to Jobak" is what this page is actually claiming.
 *
 * `region: "mena"` is the default because of who this is for. It matches on the
 * region FK rather than on the location text — `regions.country_code` is what
 * the collector resolved, and re-deriving a country from free text here would
 * repeat work the scraper already did more carefully.
 */
export const getPublicJobs = cache(async (query: JobQuery = {}): Promise<JobPage> => {
  const {
    region = "mena",
    workplace = "all",
    search = "",
    category = "all",
    limit = 60,
    page = 1,
  } = query;

  const from = (Math.max(1, page) - 1) * limit;

  try {
    const supabase = await createClient();
    const regionIds = region === "mena" ? await menaRegionIds() : [];
    const filters = { region, workplace, search, category };

    const { data, error, count } = await listQuery(supabase, regionIds, filters)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) {
      /*
       * PostgREST answers a `.range()` that starts past the last row with 416
       * rather than an empty page. That is reachable without anyone doing
       * anything wrong — collection runs continuously, so a bookmarked
       * `?page=9` goes stale on its own. Re-ask for just the total so the page
       * can say "past the end" instead of "nothing matches".
       */
      if (error.code === "PGRST103") {
        const { count: total } = await listQuery(supabase, regionIds, filters, { head: true });
        return { jobs: [], total: total ?? 0 };
      }

      logServerError("public-jobs:list", error);
      return { jobs: [], total: 0 };
    }

    return {
      jobs: ((data ?? []) as unknown as Row[]).map(toCard),
      total: count ?? 0,
    };
  } catch (error) {
    // `cookies()` throws a DynamicServerError during static generation as a
    // control-flow signal. Handing it back to Next before logging keeps the
    // build output honest — it was reporting these as errors on every build.
    unstable_rethrow(error);
    logServerError("public-jobs:list", error);
    return { jobs: [], total: 0 };
  }
});

/**
 * The filter chain shared by the page query and the count-only retry.
 *
 * `count: "exact"` rather than "estimated": the pager needs a page count that
 * agrees with what the next page actually returns, and PostgREST's estimate
 * comes from the planner's row estimate, which on these ilike-heavy queries is
 * routinely off by a factor of several.
 *
 * Deliberately *not* async, and the client and region ids are passed in. A
 * PostgREST builder is itself a thenable, so an async function returning one
 * would have it assimilated by the await — the caller would get a finished
 * response instead of a query it can still add `.range()` to.
 */
function listQuery(
  supabase: SupabaseServerClient,
  regionIds: number[],
  { region, workplace, search, category }: Required<Omit<JobQuery, "limit" | "page">>,
  { head = false }: { head?: boolean } = {},
) {
  let builder = supabase
    .from("jobs")
    .select(CARD_COLUMNS, { count: "exact", head })
    .not("public_slug", "is", null);

  if (workplace !== "all") builder = builder.eq("job_type", workplace);

  if (search.trim()) {
    const term = escapeTerm(search.slice(0, 80));
    if (term) builder = builder.or(`title.ilike.%${term}%,company.ilike.%${term}%`);
  }

  /*
   * Category is matched against the title, because the columns that should
   * hold it (`tech_stack`, `seniority`) are empty on every active row — see
   * configs/job-categories.ts.
   *
   * Each `.or()` is a separate group ANDed with the others by PostgREST, so
   * this composes correctly with the search above: a search AND a category
   * narrows, rather than one replacing the other.
   */
  const keywords = categoryKeywords(category);
  if (keywords && keywords.length > 0) {
    const clause = keywords
      .map((word) => `title.ilike.%${escapeTerm(word)}%`)
      .join(",");
    builder = builder.or(clause);
  }

  if (region === "mena") {
    /*
     * Remote roles stay in even on a MENA filter: a remote listing open to
     * anywhere is available to someone in Cairo, and `region_id` is null on
     * most of them because the collector had no country to attribute.
     */
    if (regionIds.length > 0) {
      builder = builder.or(`region_id.in.(${regionIds.join(",")}),job_type.eq.remote`);
    }
  } else if (region === "remote") {
    builder = builder.eq("job_type", "remote");
  }

  return builder;
}

/**
 * `regions.id` for every MENA country, resolved once per request.
 *
 * The collector stores geography as `jobs.region_id -> regions(id)`, so a
 * country filter is an id lookup rather than a string match. Cached because the
 * list page and any filtered variant of it both need the same answer.
 */
const menaRegionIds = cache(async (): Promise<number[]> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("regions").select("id").in("country_code", MENA_COUNTRIES);
    return (data ?? []).map((row) => row.id as number);
  } catch (error) {
    unstable_rethrow(error);
    // Without the lookup the page shows everything rather than nothing — a
    // wider list is a worse page, an empty one is a broken page.
    return [];
  }
});

export const getPublicJob = cache(async (slug: string): Promise<PublicJob | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(FULL_COLUMNS)
      .eq("public_slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) logServerError("public-jobs:detail", error);
      return null;
    }

    const row = data as unknown as Row;
    const company = one(row.companies);

    return {
      ...toCard(row),
      // Sanitised again at the boundary. The scraper already writes a safe
      // subset, but this page renders to anonymous visitors and the n8n
      // collectors also write `jobs.description` — see sanitize-description.ts.
      description: sanitizeDescription(row.description),
      applyUrl: row.apply_url ?? "",
      companyWebsite: company?.website ?? null,
      companyLinkedin: company?.linkedin_url ?? null,
      companyCareers: company?.careers_url ?? null,
    };
  } catch (error) {
    unstable_rethrow(error);
    logServerError("public-jobs:detail", error);
    return null;
  }
});

/** Relative for the first week, then an absolute date. */
export function formatPostedAt(iso: string | null): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const hours = Math.floor((Date.now() - date.getTime()) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
