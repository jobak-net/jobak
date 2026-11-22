/**
 * The contract of the public job board: the pool as anyone may see it.
 * Imports nothing (see `src/shared/README.md`).
 *
 *   GET /api/v1/job-board?region&workplace&q&category&page&limit
 *     200  JobBoardPage   newest to Jobak first
 *     400  { error }      a filter that isn't one of the values below
 *     429  { error }      rate-limited (the `job-board` policy)
 *
 *   GET /api/v1/job-board/{slug}
 *     200  PublicJob
 *     404  { error }      no public job with that slug
 *
 * Nothing per-user is ever part of it: no scores, no bookmarks, nothing about
 * who was shown what.
 */

export const JOB_BOARD_API_PATH = "/api/v1/job-board";

export const jobBoardJobApiPath = (slug: string) => `${JOB_BOARD_API_PATH}/${encodeURIComponent(slug)}`;

export const REGION_FILTERS = ["mena", "remote", "all"] as const;
/** `mena` (the default) also keeps remote roles open to anywhere. */
export type RegionFilter = (typeof REGION_FILTERS)[number];

export const WORKPLACE_FILTERS = ["all", "remote", "hybrid", "onsite"] as const;
export type WorkplaceFilter = (typeof WORKPLACE_FILTERS)[number];

/** Longest search the board looks at; anything after is ignored. */
export const JOB_BOARD_SEARCH_MAX = 80;
export const JOB_BOARD_DEFAULT_PAGE_SIZE = 24;
export const JOB_BOARD_MAX_PAGE_SIZE = 60;

/** The query string of `GET /api/v1/job-board`. Every field is optional; the defaults are the board's default view. */
export interface JobBoardQuery {
  /** Default `mena`. */
  region?: RegionFilter;
  /** Default `all`. */
  workplace?: WorkplaceFilter;
  /** Matched against title and company. */
  q?: string;
  /** A job category's `value` (`@/shared/job-categories`), or `all` (the default). */
  category?: string;
  /** 1-based. A page past the end comes back with no jobs and the real `total`. */
  page?: number;
  /** Page size, up to `JOB_BOARD_MAX_PAGE_SIZE`. */
  limit?: number;
}

export interface PublicJob {
  slug: string;
  title: string;
  company: string;
  /** Empty when the source gave none. */
  location: string;
  workplace: "remote" | "onsite" | "hybrid";
  salary: string | null;
  /** ISO date: when the board posted it, or else when Jobak collected it. */
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

/** Card-sized subset, for the board. */
export type PublicJobCard = Pick<
  PublicJob,
  "slug" | "title" | "company" | "location" | "workplace" | "salary" | "postedAt" | "source" | "tags"
>;

export interface JobBoardPage {
  jobs: PublicJobCard[];
  /** Matching jobs across every page, for the pager. */
  total: number;
}
