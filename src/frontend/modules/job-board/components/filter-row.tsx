import Link from "next/link";

/** One row of filter chips; each chip is a link to that filter's URL. */
export function FilterRow({
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
