import type { ReactNode } from "react";

/**
 * Typography for the legal pages.
 *
 * These are read differently from the rest of the site — people scan for one
 * clause rather than reading top to bottom — so the headings are dense, the
 * measure is narrow, and every section is anchored so a specific clause can be
 * linked to directly.
 */

export function LegalProse({ children }: { children: ReactNode }) {
  return (
    <div className="mt-12 max-w-2xl space-y-10 text-[15px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        {/*
          The heading is its own anchor link. Someone answering a question about
          these terms — support, or us — wants to send the clause, not the page.
        */}
        <a href={`#${id}`} className="hover:text-accent-text transition-colors">
          {heading}
        </a>
      </h2>
      {children}
    </section>
  );
}

/** The "last updated" line. Dated by hand, because it is a claim about content. */
export function LegalUpdated({ date }: { date: string }) {
  return (
    <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
      Last updated {date}
    </p>
  );
}
