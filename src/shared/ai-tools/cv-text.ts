/**
 * Working with a CV's text on both sides (imports nothing; see
 * `src/shared/README.md`): finding the CV's own words that a review quotes,
 * and spotting numbers an improved version claims that the original doesn't.
 */

/** Quotes and apostrophes models straighten or curl at will. */
const QUOTE_CHARS = /['‘’`"“”]/g;

/** `text` with typographic variants flattened, character for character (same length, same offsets). */
function flatten(text: string): string {
  return text.replace(QUOTE_CHARS, "'").replace(/[‐‑‒–—−]/g, "-").toLowerCase();
}

/**
 * Where the CV says `quote`, or null. Models quote loosely, so differences in
 * spacing and line breaks, quote marks, dash kinds and letter case don't
 * matter; wording does. The result is offsets into `text` itself, for
 * highlighting.
 */
export function findQuote(text: string, quote: string): { start: number; end: number } | null {
  const words = flatten(quote)
    .replace(/^[\s'.,;:-]+|[\s'.,;:-]+$/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0 || words.join(" ").length < 4) return null;

  const pattern = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
  const match = pattern.exec(flatten(text));
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/** An email, or what a model made of one ("name@<personal-domain>.com"): anything up to a space or separator. */
const EMAIL = /[\w.+-]+@[^\s|,;()]+/g;
/** A link with a path (LinkedIn, GitHub, a portfolio): "linkedin.com/in/name", "https://github.com/name". */
const LINK = /\b(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})\/[^\s|,;()]+/gi;
/** A template slot a model left in: "<personal-domain>", "<your-portfolio-url>". */
const SLOT = /<[a-z][a-z0-9 _-]{1,40}>/gi;

const trimEnd = (value: string) => value.replace(/[.)\]]+$/, "");
const emailsIn = (text: string) => [...text.matchAll(EMAIL)].map((m) => trimEnd(m[0]));
const linksIn = (text: string) =>
  [...text.matchAll(LINK)].map((m) => ({ link: trimEnd(m[0]), host: m[1]!.toLowerCase() }));

/**
 * The improved CV with the original's contact details put back. Models
 * "professionalise" them however often they're told not to: an AOL address
 * came back as "name@<personal-domain>.com". Contact details are facts, so:
 *
 *  - an email the original doesn't have is replaced by the original email
 *    with the same name before the "@", or by the original's only email;
 *  - a link to a site the original links to, with a different path, is
 *    replaced by the original link;
 *  - a template slot left in ("<your-portfolio-url>") takes its line with it,
 *    unless the original has the same text.
 *
 * Returns what kind of thing was put back or removed ("email", "link",
 * "slot line"), never the values: contact details don't belong in logs.
 */
export type RestoredContact = "email" | "link" | "slot line";

export function restoreContactDetails(improved: string, original: string): { text: string; restored: RestoredContact[] } {
  const restored: RestoredContact[] = [];
  let text = improved;

  const originalEmails = emailsIn(original);
  const known = new Set(originalEmails.map((e) => e.toLowerCase()));
  for (const email of new Set(emailsIn(text))) {
    if (known.has(email.toLowerCase())) continue;
    const local = email.split("@")[0]!.toLowerCase();
    const match =
      originalEmails.find((e) => e.split("@")[0]!.toLowerCase() === local) ??
      (originalEmails.length === 1 ? originalEmails[0] : undefined);
    if (match) {
      text = text.split(email).join(match);
      restored.push("email");
    }
  }

  const originalLinks = linksIn(original);
  const knownLinks = new Set(originalLinks.map((l) => l.link.toLowerCase()));
  for (const { link, host } of linksIn(text)) {
    if (knownLinks.has(link.toLowerCase())) continue;
    const match = originalLinks.find((l) => l.host === host);
    if (match) {
      text = text.split(link).join(match.link);
      restored.push("link");
    }
  }

  const lines = text.split("\n").filter((line) => {
    const slots = (line.match(SLOT) ?? []).filter((slot) => !original.includes(slot));
    if (slots.length > 0) restored.push("slot line");
    return slots.length === 0;
  });

  return { text: lines.join("\n"), restored };
}

/** "35%", "5,000", "3x", "2.5": numbers as written, without years (they're dates, checked as text). */
const NUMBER = /(?<![\p{L}\p{N}])\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?\s?(?:%|x\b|k\b|\+)?/giu;

function numbersIn(text: string): string[] {
  return [...text.matchAll(NUMBER)].map((m) => m[0].trim()).filter((n) => !/^(?:19|20)\d{2}$/.test(n));
}

/** "5,000" and "5000" are the same number; "35 %" and "35%" too. */
function numberKey(value: string): string {
  return value.toLowerCase().replace(/[\s,]/g, "");
}

/**
 * Numbers the improved text states that the original never does: an invented
 * metric ("reduced load time by 35%", "served 5,000 users"). Each returned as
 * written, once. Years and the digits of dates are left out.
 */
export function unsupportedNumbers(improved: string, original: string): string[] {
  const known = new Set(numbersIn(original).map(numberKey));
  // A bare number in the original also covers its percentage and multiples ("40" → "40%").
  for (const n of [...known]) known.add(n.replace(/[%x+k]$/, ""));
  const seen = new Set<string>();
  return numbersIn(improved).filter((n) => {
    const key = numberKey(n);
    if (known.has(key) || known.has(key.replace(/[%x+k]$/, "")) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
