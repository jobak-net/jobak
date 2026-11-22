import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
export function Pagination({
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
