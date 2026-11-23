import { normalizeTypography } from "@/shared/ai-tools";

/**
 * Reading what a model sends back, for every AI tool that asks for structure:
 * a JSON object (without the provider's JSON mode, which Groq refused for
 * long replies), or plain text in `=== NAME ===` sections (a CV is text, and
 * a long one inside a JSON string is where JSON mode broke). Lenient on form,
 * strict on content: scores clamped to their range, placeholders removed.
 */

/** A string from a parsed reply, tidied and bounded; "" for anything else. */
export const str = (value: unknown, max = 600): string =>
  typeof value === "string" ? normalizeTypography(value).trim().slice(0, max) : "";

/** Up to `count` non-empty strings from a parsed reply's array. */
export const strings = (value: unknown, count: number, max = 400): string[] =>
  Array.isArray(value) ? value.map((v) => str(v, max)).filter(Boolean).slice(0, count) : [];

/**
 * The first JSON object in a reply. Models wrap it in prose or code fences
 * however often they're told not to, and sometimes leave a trailing comma.
 */
export function extractJson(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const body = reply.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    try {
      return JSON.parse(body.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/** A scorecard category: what the model scores, out of `max`. */
export interface ScoreCategory<Id extends string = string> {
  id: Id;
  label: string;
  max: number;
}

export interface CategoryScore<Id extends string = string> extends ScoreCategory<Id> {
  score: number;
  feedback: string;
}

/**
 * Each category's score from `{ id: { score, feedback } }` (or `{ id: n }`),
 * clamped to its range and rounded; a missing one is 0. The total is then
 * their sum, so it always adds up.
 */
export function readScores<Id extends string>(value: unknown, categories: readonly ScoreCategory<Id>[]): CategoryScore<Id>[] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return categories.map((c) => {
    const entry = record[c.id] as { score?: unknown; feedback?: unknown } | number | undefined;
    const raw = typeof entry === "number" ? entry : Number((entry as { score?: unknown } | undefined)?.score);
    const score = Number.isFinite(raw) ? Math.round(Math.min(c.max, Math.max(0, raw))) : 0;
    const feedback = typeof entry === "object" && entry ? str(entry.feedback, 300) : "";
    return { id: c.id, label: c.label, score, max: c.max, feedback };
  });
}

/** `id: 8 | one line` lines (a `=== SCORES ===` section) as `{ id: { score, feedback } }`, for `readScores`. */
export function scoreLines(text: string | undefined): Record<string, { score: number; feedback: string }> {
  const scores: Record<string, { score: number; feedback: string }> = {};
  for (const line of (text ?? "").split("\n")) {
    const match = /^\s*[-*]?\s*([a-z]+)\s*:\s*(\d{1,3})(?:\s*\/\s*\d+)?\s*(?:\|\s*(.*))?$/i.exec(line);
    if (match) scores[match[1]!.toLowerCase()] = { score: Number(match[2]), feedback: (match[3] ?? "").trim() };
  }
  return scores;
}

/** The text of each `=== NAME ===` section of a reply. */
export function sections(reply: string): Map<string, string> {
  const found = new Map<string, string>();
  const parts = reply.replace(/\r\n?/g, "\n").split(/^\s*={2,}\s*([A-Z][A-Z ]+?)\s*={2,}\s*$/m);
  for (let i = 1; i < parts.length; i += 2) found.set(parts[i]!.trim(), (parts[i + 1] ?? "").trim());
  return found;
}

/** A section's "- item" lines as items, without "Nothing". */
export const bullets = (text: string | undefined, max = 10): string[] =>
  (text ?? "")
    .split("\n")
    .map((line) => normalizeTypography(line).replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line && !/^nothing\.?$/i.test(line))
    .slice(0, max);

/** A line that only holds a placeholder: "(Details to be provided: …)", "[Add your project]". */
const PLACEHOLDER = /^\s*(?:[-*•]\s*)?[[(](?:details?|to be|add|insert|placeholder|your|tbd|n\/a)\b[^\])]*[\])]\.?\s*$/i;

/**
 * The CV without placeholder lines, and without a section that held nothing
 * else. Models add them however often they're told not to; what's missing
 * belongs under "Still needed", not in the CV.
 */
export function withoutPlaceholders(cv: string): string {
  return cv
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const kept = lines.filter((line) => !PLACEHOLDER.test(line));
      // A heading whose only content was a placeholder: the whole section goes.
      return kept.length < lines.length && kept.length <= 1 ? "" : kept.join("\n");
    })
    .filter((block) => block.trim())
    .join("\n\n");
}

/**
 * A rewritten CV from a reply's section, as plain text for ATS: typography a
 * person doesn't type replaced, code fences and stray markdown (bold, `#`
 * headings) removed, placeholders removed, spacing tidied.
 */
export function tidyCvText(raw: string): string {
  return withoutPlaceholders(normalizeTypography(raw))
    .replace(/^```\w*\n?|\n?```$/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
