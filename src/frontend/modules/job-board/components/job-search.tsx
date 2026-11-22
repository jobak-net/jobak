import { Search, X } from "lucide-react";
import Link from "next/link";

/**
 * Keyword search for the jobs board.
 *
 * ── Why a plain form and not a controlled input ─────────────
 * The rest of this page's filtering is links, deliberately: every combination
 * is a real URL, so it is crawlable, shareable and works with JavaScript
 * disabled. A live-filtering React input would break that for the one control
 * people use most.
 *
 * A GET form gets the same properties for free — the browser builds
 * `/jobs?q=...` itself on submit. No client component, no state, no
 * hydration.
 *
 * The hidden inputs carry the other filters through, so searching inside
 * "Remote in MENA" stays inside it rather than silently resetting to the
 * default view.
 */
export function JobSearch({
  value,
  region,
  workplace,
  category,
  clearHref,
}: {
  value: string;
  region: string;
  workplace: string;
  category: string;
  /** Where the clear button goes — the same view with no query. */
  clearHref: string;
}) {
  return (
    <form action="/jobs" method="get" role="search" className="relative max-w-xl">
      {/*
        Only the non-default values are carried. Emitting `region=mena` would
        put the default in the URL and make the canonical `/jobs` unreachable
        by searching.
      */}
      {region !== "mena" && <input type="hidden" name="region" value={region} />}
      {workplace !== "all" && (
        <input type="hidden" name="workplace" value={workplace} />
      )}
      {category !== "all" && (
        <input type="hidden" name="category" value={category} />
      )}

      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />

      <input
        type="search"
        name="q"
        defaultValue={value}
        placeholder="Search by job title or company…"
        aria-label="Search jobs by title or company"
        maxLength={80}
        className="w-full pl-11 pr-24 py-3 rounded-full bg-white/2 border border-border-standard text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors text-sm"
      />

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <Link
            href={clearHref}
            aria-label="Clear search"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </Link>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-accent text-(--bg-canvas) text-xs font-medium hover:bg-accent-bright transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
