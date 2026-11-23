import { findQuote } from "@/shared/ai-tools";

export interface Highlight {
  start: number;
  end: number;
  /** The number shown on the mark, matching the issue's number in the list. */
  label: number;
  tone: "issue" | "phrase";
}

export type Segment = { text: string; highlight?: Highlight };

/**
 * The CV's text cut into plain and highlighted runs, for marking up the
 * passages the review is about. Quotes are found the same way the server
 * checked them (`findQuote`); overlapping ones keep the first.
 */
export function segmentsFor(text: string, quotes: { quote: string; label: number; tone: Highlight["tone"] }[]): Segment[] {
  const found = quotes
    .map((q) => {
      const at = findQuote(text, q.quote);
      return at ? { ...at, label: q.label, tone: q.tone } : null;
    })
    .filter((h): h is Highlight => h !== null)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of found) {
    if (h.start < cursor) continue;
    if (h.start > cursor) segments.push({ text: text.slice(cursor, h.start) });
    segments.push({ text: text.slice(h.start, h.end), highlight: h });
    cursor = h.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
