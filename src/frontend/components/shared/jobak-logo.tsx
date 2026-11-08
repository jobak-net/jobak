import Link from "next/link";
import { cn } from "@/frontend/lib/utils/utils";

interface JobakLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

/**
 * The Jobak mark — "Horizon J".
 *
 * The previous mark was a rounded-square badge containing a sun disc, a quarter
 * arc and two horizon rules: five elements, four of them hairlines. It smudged
 * into a single blob below about 24px (the sidebar renders it at 28, a favicon
 * at 16) and the dark badge fill made it vanish on any light ground.
 *
 * This keeps the idea exactly — a sun clearing a horizon, career growth — and
 * re-cuts it as a J, which is what every reference in `references/logos` does:
 * flat, one colour, geometric, a detached tittle, no container. The J's bowl
 * *is* the horizon and the disc is the sun above it. One stroke weight, one
 * curve, two elements.
 *
 * It draws in `currentColor`, so the same component works in accent on the
 * marketing site, in white on the sidebar, and in black on a light background —
 * the last of which the old mark could not do at all.
 */
const MARK_SIZE = { sm: 26, md: 32, lg: 40 } as const;

/*
 * How much of the mark's box sits to the right of the J's stem.
 *
 * The stem's outer edge is at x=42 plus half the 7-unit stroke, so 45.5 of 64 —
 * leaving 28.9% of the box as empty bearing. That gap is why "obak" looked
 * detached from the J even at `gap: 1px`: it was clearing the SVG's padding,
 * not the letter. The lockup pulls the text back by that bearing less a small
 * optical gap, and because it is a *fraction* of the mark size it holds at 26,
 * 32 and 40px rather than needing a hand-tuned pixel value per size.
 */
const TUCK = 0.289 - 0.062;

/** The J itself, at any pixel size. Shared by the lockup and the standalone mark. */
function MarkSvg({ dim, className }: { dim: number; className?: string }) {
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-accent", className)}
      aria-hidden="true"
    >
      {/* The horizon: the J's bowl, drawn as a single unbroken stroke. */}
      <path
        d="M42 12 V38 A10 10 0 0 1 22 38"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      {/* The sun, detached — the tittle every reference monogram carries. */}
      <circle cx="25" cy="22" r="5.5" fill="currentColor" />
    </svg>
  );
}

function LogoMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return <MarkSvg dim={MARK_SIZE[size]} className={className} />;
}

/**
 * The J on its own — the collapsed dashboard sidebar, and anywhere the full
 * lockup does not fit.
 *
 * The same geometry as the homepage logo, not a separate drawing. The app once
 * used a different J here (a thicker one knocked out of a green tile), so the
 * collapsed sidebar and the favicon showed a letter the homepage never did.
 */
export function JobakMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span role="img" aria-label="Jobak" className="inline-flex">
      <MarkSvg dim={size} className={className} />
    </span>
  );
}

export function JobakLogo({ showText = true, size = "md", href = "/", className }: JobakLogoProps) {
  const textClass = size === "sm" ? "text-[17px]" : size === "lg" ? "text-[28px]" : "text-xl";

  /*
   * The mark *is* the J, so the wordmark only carries "obak".
   *
   * That makes the visible text a non-word, so the accessible name is set on
   * the wrapper and both halves are hidden from assistive tech — otherwise a
   * screen reader announces the brand as "obak", and so does anything that
   * scrapes the link text.
   */
  const content = (
    <span
      role="img"
      aria-label="Jobak"
      className={cn("group flex select-none items-center", className)}
    >
      <LogoMark size={size} />
      {showText && (
        <span
          aria-hidden="true"
          style={{ marginLeft: -MARK_SIZE[size] * TUCK }}
          className={cn(
            /*
             * -0.035em rather than Tailwind's `tracking-tight`. The tighter set
             * is what makes a wordmark read as drawn rather than typed, and at
             * five characters there is no legibility cost.
             */
            "font-display font-semibold tracking-[-0.035em] text-fg-primary",
            textClass
          )}
        >
          obak
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {content}
    </Link>
  );
}
