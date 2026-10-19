import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, ChevronLeft, ChevronRight, Clock, MapPin, Wifi } from "lucide-react";
import {
  formatPostedAt,
  getPublicJobs,
  type RegionFilter,
  type WorkplaceFilter,
} from "@/backend/actions/public-jobs";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { isProductionSite } from "@/frontend/lib/configs/site";
import { JsonLd } from "@/frontend/components/shared/json-ld";
import { JobSearch } from "@/frontend/components/public/jobs/job-search";
import { JOB_CATEGORIES, categoryLabel } from "@/frontend/lib/configs/job-categories";

/**
 * The public jobs board.
 *
 * Two things shape it:
 *
 *  - **MENA is the default view**, not "everything, newest first". Recency
 *    order on a busy collection day buries Cairo and Riyadh under a wall of
 *    remote-worldwide listings, which is the opposite of who this is for.
 *  - **Filters are links, not state.** Every combination is a real URL, so it
 *    is crawlable, shareable and works with no JavaScript — and the LinkedIn
 *    posts can point at a filtered view when that is the better landing page.
 */

interface PageProps {
  searchParams: Promise<{
    region?: string;
    workplace?: string;
    q?: string;
    category?: string;
    page?: string;
  }>;
}

/**
 * Divisible by both grid widths (2 and 3 columns), so the last row of a full
 * page is never a lone card hanging off the left.
 */
const PAGE_SIZE = 24;

const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: "mena", label: "MENA" },
  { value: "remote", label: "Remote" },
  { value: "all", label: "Everywhere" },
];

const WORKPLACES: { value: WorkplaceFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

function readRegion(value: string | undefined): RegionFilter {
  return value === "remote" || value === "all" ? value : "mena";
}

function readWorkplace(value: string | undefined): WorkplaceFilter {
  return value === "remote" || value === "hybrid" || value === "onsite" ? value : "all";
}

/** Unrecognised values fall back to "all" rather than returning nothing. */
function readCategory(value: string | undefined): string {
  return value && JOB_CATEGORIES.some((c) => c.value === value) ? value : "all";
}

/** `?page=0`, `?page=-3` and `?page=banana` all mean page one. */
function readPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  ...JOB_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

/**
 * Only the non-default parts, so the canonical `/jobs` stays clean.
 *
 * `page` is deliberately opt-in: the filter and search links never pass it, so
 * changing any filter drops you back to page one rather than onto page 7 of a
 * result set that may only have two.
 */
function hrefFor(next: {
  region?: RegionFilter;
  workplace?: WorkplaceFilter;
  q?: string;
  category?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (next.region && next.region !== "mena") params.set("region", next.region);
  if (next.workplace && next.workplace !== "all") params.set("workplace", next.workplace);
  if (next.category && next.category !== "all") params.set("category", next.category);
  if (next.q) params.set("q", next.q);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const region = readRegion(params.region);
  const workplace = readWorkplace(params.workplace);
  const category = readCategory(params.category);
  const categoryName = categoryLabel(category);
  const page = readPage(params.page);

  const scope =
    region === "mena" ? "in MENA" : region === "remote" ? "remote worldwide" : "worldwide";
  const kind = workplace === "all" ? "" : `${WORKPLACES.find((w) => w.value === workplace)?.label} `;

  // "Latest Remote Engineering jobs in MENA" — the category reads better before
  // the workplace, since it is the more specific of the two.
  const title = categoryName
    ? `Latest ${kind}${categoryName} jobs ${scope}`
    : `Latest ${kind}jobs ${scope}`;
  const description =
    `New ${kind.toLowerCase()}openings ${scope}, collected from Wuzzuf, Bayt, Talent.com, LinkedIn, ` +
    "remote job boards and companies' own career pages. Free to browse, no account needed.";

  /*
   * Every filtered view points its canonical at the unfiltered page. They are
   * the same listings in a different order, and letting each combination be
   * indexed separately is how a job board earns a duplicate-content penalty.
   */
  const filtered =
    region !== "mena" ||
    workplace !== "all" ||
    category !== "all" ||
    page > 1 ||
    Boolean(params.q);

  return {
    title: page > 1 ? `${title} — page ${page} — Jobak` : `${title} — Jobak`,
    description,
    keywords: [
      "jobs in Egypt", "jobs in Saudi Arabia", "jobs in UAE", "MENA jobs",
      "remote jobs MENA", "وظائف", "وظائف مصر", "وظائف عن بعد",
    ],
    alternates: { canonical: "/jobs" },
    openGraph: {
      type: "website",
      title,
      description,
      url: hrefFor({ region, workplace, category, q: params.q, page }),
      siteName: "Jobak",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: isProductionSite
      ? { index: !filtered, follow: true }
      : { index: false, follow: false },
  };
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const region = readRegion(params.region);
  const workplace = readWorkplace(params.workplace);
  const category = readCategory(params.category);
  const search = (params.q ?? "").slice(0, 80);
  const page = readPage(params.page);

  const { jobs, total } = await getPublicJobs({
    region,
    workplace,
    search,
    category,
    limit: PAGE_SIZE,
    page,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;

  /*
   * An `ItemList` of the results — the same structure this service reads from
   * Bayt and Talent.com to discover their listings. Publishing it makes this
   * page legible to the aggregators that come looking.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest jobs on Jobak",
    numberOfItems: total,
    // Positions continue across pages — page 2 starts at 25, not back at 1.
    itemListElement: jobs.map((job, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      url: `/jobs/${job.slug}`,
      name: `${job.title} at ${job.company}`,
    })),
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />

      <PageIntro
        eyebrow="Jobs"
        title={
          <>
            The latest openings,
            <br />
            <span className="text-muted-foreground">no account needed.</span>
          </>
        }
        lead="Collected from Wuzzuf, Bayt, Talent.com, LinkedIn, remote job boards and companies' own career pages. Sign in to have them scored against your profile."
      />

      {/* ── Search ──────────────────────────────────────── */}
      <div className="mt-12">
        <JobSearch
          value={search}
          region={region}
          workplace={workplace}
          category={category}
          clearHref={hrefFor({ region, workplace, category })}
        />
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        {/*
          Category gets its own row: there are ten options, and wrapping them
          alongside the other two rows made every filter hard to find.
        */}
        <FilterRow
          label="Category"
          options={CATEGORY_OPTIONS}
          active={category}
          hrefFor={(value) => hrefFor({ region, workplace, category: value, q: search })}
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 *:min-w-0">
          <FilterRow
            label="Region"
            options={REGIONS}
            active={region}
            hrefFor={(value) =>
              hrefFor({ region: value as RegionFilter, workplace, category, q: search })
            }
          />
          <FilterRow
            label="Workplace"
            options={WORKPLACES}
            active={workplace}
            hrefFor={(value) =>
              hrefFor({ region, workplace: value as WorkplaceFilter, category, q: search })
            }
          />
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {total === 0
          ? "No openings match this view."
          : `${total} opening${total === 1 ? "" : "s"}`}
        {pageCount > 1 && (
          <span className="text-muted-foreground/70">{` · page ${page} of ${pageCount}`}</span>
        )}
        {region === "mena" && total > 0 && (
          <span className="text-muted-foreground/70">
            {" "}
            — MENA plus remote roles open to anywhere
          </span>
        )}
      </p>

      {/*
        An out-of-range page is its own case. Collection runs continuously, so
        a bookmarked `?page=9` goes stale on its own, and telling someone their
        filters match nothing when they match 140 things is just wrong.
      */}
      {jobs.length === 0 && total > 0 ? (
        <p className="mt-8 text-muted-foreground max-w-xl">
          Page {page} is past the end of these results.{" "}
          <Link
            href={hrefFor({ region, workplace, category, q: search })}
            className="text-accent underline underline-offset-2"
          >
            Back to the first page
          </Link>
          .
        </p>
      ) : jobs.length === 0 ? (
        <p className="mt-8 text-muted-foreground max-w-xl">
          {search ? (
            <>
              Nothing matches “{search}”. Try{" "}
              <Link href={hrefFor({ region, workplace, category })} className="text-accent underline underline-offset-2">
                clearing the search
              </Link>{" "}
              or{" "}
            </>
          ) : (
            <>Try{" "}</>
          )}
          <Link href={hrefFor({ region: "all", workplace: "all" })} className="text-accent underline underline-offset-2">
            widening to everywhere
          </Link>
          , or check back shortly — the collectors run continuously.
        </p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.slug}
              href={`/jobs/${job.slug}`}
              className="group flex flex-col p-5 rounded-2xl border border-border-standard bg-white/2 hover:border-foreground/30 transition-all"
            >
              <h2 className="text-base font-semibold leading-snug group-hover:text-accent-text transition-colors">
                {job.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{job.company}</p>

              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 text-xs text-muted-foreground">
                {/*
                  Guarded because `jobs.location` held the literal string
                  "[object Object]" for the sources that publish a structured
                  location — see db/supabase/013_repair_job_data.sql. Repaired rows are
                  blank, and a blank location should render as nothing at all.
                */}
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[14rem]">{job.location}</span>
                  </span>
                )}
                {job.workplace === "remote" && (
                  <span className="inline-flex items-center gap-1.5 text-accent-text">
                    <Wifi className="w-3 h-3 shrink-0" />
                    Remote
                  </span>
                )}
                {job.workplace === "hybrid" && <span>Hybrid</span>}
                {job.salary && (
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[10rem]">{job.salary}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-auto pt-4 text-xs text-muted-foreground/70">
                <Clock className="w-3 h-3 shrink-0" />
                {formatPostedAt(job.postedAt)}
                {job.source && <span className="ml-auto truncate">{job.source}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefFor={(value) =>
            hrefFor({ region, workplace, category, q: search, page: value })
          }
        />
      )}
    </PageShell>
  );
}

/**
 * Link-based pager, to match the filters.
 *
 * Every page is a real URL with no client state, so it survives a share, a
 * back button and a cold load with JavaScript off.
 *
 * The numbered buttons are desktop-only. Ten 40px targets do not fit a 360px
 * screen without either shrinking below the tap minimum or starting a second
 * horizontal scroller directly under one the user already has to find; the
 * phone gets prev/next and a position readout instead.
 */
function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-between gap-4 border-t border-border-subtle pt-6"
    >
      <PagerLink href={hrefFor(page - 1)} disabled={!hasPrev} label="Previous page">
        <ChevronLeft className="w-4 h-4" />
        <span>Prev</span>
      </PagerLink>

      <div className="hidden sm:flex items-center gap-1.5">
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden
              className="px-1 text-xs text-muted-foreground/50"
            >
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={hrefFor(entry)}
              rel="nofollow"
              aria-current={entry === page ? "page" : undefined}
              aria-label={`Page ${entry}`}
              className={`min-w-9 px-3 py-1.5 rounded-full text-center text-xs font-medium border transition-all ${
                entry === page
                  ? "bg-accent text-(--bg-canvas) border-accent"
                  : "border-border-standard text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {entry}
            </Link>
          ),
        )}
      </div>

      <span className="sm:hidden text-xs font-mono text-muted-foreground/70">
        {page} / {pageCount}
      </span>

      <PagerLink href={hrefFor(page + 1)} disabled={!hasNext} label="Next page">
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </PagerLink>
    </nav>
  );
}

/** A disabled pager end renders as a span — a dead <a href> is a broken link. */
function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const className =
    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-border-standard transition-all";

  if (disabled) {
    return (
      <span aria-disabled className={`${className} text-muted-foreground/30`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      rel="nofollow"
      aria-label={label}
      className={`${className} text-muted-foreground hover:text-foreground hover:border-foreground/30`}
    >
      {children}
    </Link>
  );
}

/**
 * First, last, and three pages around the current one, with an ellipsis for
 * whatever is skipped.
 *
 * The middle three slide inward at either end rather than shrinking, so page 1
 * and page 12 of 12 both offer the same amount to jump to.
 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const start = Math.min(Math.max(page - 1, 2), pageCount - 3);
  const middle = [start, start + 1, start + 2];

  return [
    1,
    ...(middle[0] > 2 ? (["gap"] as const) : []),
    ...middle,
    ...(middle[2] < pageCount - 1 ? (["gap"] as const) : []),
    pageCount,
  ];
}

function FilterRow({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  hrefFor: (value: string) => string;
}) {
  return (
    // `min-w-0` + `overflow-x-auto`: Category alone is ten chips, which is far
    // wider than a phone. Without a scroll container the row was simply clipped
    // by PageShell's `overflow-x-hidden` and everything past "Data & AI" was
    // unreachable. The negative margin and padding let the focus ring on a
    // chip breathe without the scroller cropping it.
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar -my-1 py-1">
        {options.map((option) => {
          const selected = active === option.value;
          return (
            <Link
              key={option.value}
              href={hrefFor(option.value)}
              // A filtered view is a different slice of the same listings, so it
              // is followed for discovery but not indexed as its own page.
              rel={selected ? undefined : "nofollow"}
              aria-current={selected ? "true" : undefined}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                selected
                  ? "bg-accent text-(--bg-canvas) border-accent"
                  : "border-border-standard text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
