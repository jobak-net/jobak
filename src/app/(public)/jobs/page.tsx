import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { isProductionSite } from "@/frontend/lib/configs/site";
import { JsonLd } from "@/frontend/components/shared/json-ld";
import {
  CATEGORY_OPTIONS,
  FilterRow,
  JobCard,
  JobSearch,
  PAGE_SIZE,
  Pagination,
  REGIONS,
  WORKPLACES,
  hrefFor,
  jobBoardJsonLd,
  readCategory,
  readPage,
  readRegion,
  readWorkplace,
} from "@/frontend/components/public/jobs";
import { loadJobBoard } from "@/frontend/lib/api/loaders/job-board";
import type { RegionFilter, WorkplaceFilter } from "@/shared/contracts/job-board";
import { categoryLabel } from "@/shared/job-categories";

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

  const { jobs, total } = await loadJobBoard({
    region,
    workplace,
    q: search,
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
  return (
    <PageShell>
      <JsonLd data={jobBoardJsonLd(jobs, total, offset)} />

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
            <JobCard key={job.slug} job={job} />
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
