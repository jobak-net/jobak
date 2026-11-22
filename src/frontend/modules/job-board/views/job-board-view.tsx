import Link from "next/link";

import { JsonLd, PageIntro, PageShell } from "@/frontend/shared/components";
import type { PublicJobCard, RegionFilter, WorkplaceFilter } from "@/shared/contracts/job-board";

import { FilterRow } from "../components/filter-row";
import { JobCard } from "../components/job-card";
import { JobSearch } from "../components/job-search";
import { Pagination } from "../components/pagination";
import { CATEGORY_OPTIONS, PAGE_SIZE, REGIONS, WORKPLACES, hrefFor, type BoardView } from "../lib/board-url";
import { jobBoardJsonLd } from "../lib/job-json-ld";

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
export function JobBoardView({
  view,
  jobs,
  total,
}: {
  view: BoardView;
  jobs: PublicJobCard[];
  total: number;
}) {
  const { region, workplace, category, search, page } = view;
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
