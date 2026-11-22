import Link from "next/link";

/** A rail section's heading, with an optional "sample" marker and link. */
export function RailHeading({ title, sample, href, linkLabel }: { title: string; sample?: boolean; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">
        {title}
        {sample && <span className="ml-2 text-xs font-normal text-fg-quaternary">sample</span>}
      </h2>
      {href && (
        <Link href={href} className="text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
