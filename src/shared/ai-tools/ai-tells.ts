/**
 * What makes text read as machine-written — the patterns in Wikipedia's
 * "Signs of AI writing" (which the popular "humanizer" skills are built on),
 * narrowed to cover letters, plus the sentence statistics detectors such as
 * GPTZero weigh: even sentence lengths, sentences that all start the same way.
 *
 * Shared by both sides (imports nothing; see `src/shared/README.md`). The
 * server tells the model to avoid all of it, measures the draft, and feeds
 * what it finds into a humanizing edit. The browser runs the same checks on
 * the letter as the user edits it, to show what's left to reword.
 *
 * This is about writing that reads as a person's, not a promise about
 * detectors: they're statistical and unreliable, and no rewrite guarantees a
 * pass. The user's own edits matter most.
 */

/** Words models reach for far more often than people do. */
const VOCABULARY = [
  "delve", "delving", "tapestry", "testament", "pivotal", "foster", "fostering", "showcase", "showcasing",
  "underscore", "underscores", "underscoring", "vibrant", "seamless", "seamlessly", "leverage", "leveraging",
  "robust", "realm", "intricate", "embark", "elevate", "harness", "harnessing", "unwavering", "meticulous",
  "meticulously", "commendable", "invaluable", "synergy", "synergies", "cutting-edge", "game-changer",
  "holistic", "paramount", "transformative", "spearhead", "spearheaded", "spearheading", "empower",
  "empowering", "passionate", "dynamic", "thrive", "thriving", "adept", "endeavor", "endeavour", "bespoke",
  "landscape", "ever-evolving", "fast-paced", "hone", "honed", "honing", "equips", "equipped me",
  "adeptly", "proficient", "proficiency", "skill set", "skillset", "furthermore", "moreover", "additionally", "impactful",
];

/** Stock phrases, as patterns. Each match is reported as written. */
const PHRASES: RegExp[] = [
  /\bI am (?:writing to (?:express|apply)|excited to|thrilled to|eager to|delighted to)\b/gi,
  /\bI am (?:a|an) [\w\s‑-]{0,40}?professional\b/gi,
  /\bI am (?:a|an) (?:junior|mid-level|mid|senior|lead|experienced|seasoned|motivated|dedicated|results-driven)\b/gi,
  /\bI am (?:comfortable|familiar|confident|passionate|well-versed|adept|proficient)\b/gi,
  /\b(?:would be|am) (?:a )?(?:great|perfect|ideal|strong) fit\b/gi,
  /\baligns? (?:perfectly |closely |well )?with (?:my|your|the company['’]?s|[A-Z]\w+['’]?s)\b/g,
  /\bperfectly aligns?\b/gi,
  /\bdeep(?:er)? understanding\b/gi,
  /\b(?:this|my|a strong|a solid) foundation\b/gi,
  /\b(?:my|this) expertise\b/gi,
  /\bcollaborative (?:approach|mindset|spirit)\b/gi,
  /\bbroaden my (?:technical )?(?:scope|horizons|skill ?set)\b/gi,
  /\bmake a (?:meaningful|lasting|significant) (?:impact|contribution)\b/gi,
  /\bcontribute (?:reliably|effectively|meaningfully|significantly)\b/gi,
  /\b(?:support|supporting|advance|advancing) (?:the company['’]?s|your|its) (?:mission|vision|goals)\b/gi,
  /\b(?:a proven track record|hit the ground running|bring (?:a )?unique blend)\b/gi,
  /\bin today['’]?s (?:fast-paced|ever-changing|competitive|digital)\b/gi,
  /\bI would be (?:happy|delighted|glad|eager) to discuss\b/gi,
  /\b(?:look(?:ing)? forward to the (?:opportunity|possibility) (?:to|of))\b/gi,
  /\bwhether [^.,;]{2,30}, [^.,;]{2,30},? or [^.,;]{2,30}\b/gi,
  // Impersonal constructions: a participle opening, or an abstract noun doing what the applicant did.
  /(?<=^|[.!?]\s+)Having (?:built|worked|developed|spent|gained|led|managed|created|designed|delivered)\b/gm,
  /\b(?:background|experience|work) (?:in [\w\s-]{1,40}?)?(?:equips|has equipped|has prepared|positions|has sharpened|has strengthened|informs)\b/gi,
  /\b(?:sharpened|strengthened|refined) (?:my|the) (?:ability|skills?)\b/gi,
  /\b(?:a )?(?:solid|strong|firm) grasp of\b/gi,
  /\btransfers? (?:directly|well|naturally|seamlessly)\b/gi,
  /\b(?:eager|keen) to contribute\b/gi,
  /\bcritical (?:need|importance)\b/gi,
  /\b(?:a )?(?:careful|thoughtful|considered) approach to\b/gi,
  // Seen in real drafts after the rules above were in place.
  /\bresonates? with\b/gi,
  /\b(?:a )?clear fit\b/gi,
  /\bbest practices\b/gi,
  /\bcareer goals\b/gi,
  /\bthe kind of impact\b/gi,
  /\b(?:I am|I'm|I’m) ready to apply\b/gi,
  /\blook forward to discussing\b/gi,
  /\bdeliver(?:ing)? reliable\b/gi,
  /\bI (?:thrive|excel)\b/gi,
  /\bI(?: am|['’]m) (?:drawn|attracted) to\b/gi,
  /\bthe prospect of\b/gi,
  /\bhow my (?:[\w-]+ ){0,2}(?:background|experience|skills?|expertise)(?: [\w-]+){0,4} (?:can|could|would|will) (?:support|help|benefit|contribute|strengthen|add value)\b/gi,
  /\b(?:ready|prepared) to (?:learn|acquire|pick up)\b/gi,
];

interface Tell {
  pattern: RegExp;
  /** Shown instead of the matched text, for structural patterns. */
  label?: string;
}

const TELLS: Tell[] = [
  { pattern: new RegExp(`\\b(?:${VOCABULARY.map((w) => w.replace(/[-\s]/g, "[-\\s]")).join("|")})\\b`, "gi") },
  ...PHRASES.map((pattern) => ({ pattern })),
  { pattern: /\bnot (?:just|only|merely) [^.;:!?]{1,60}?,? but(?: also)?\b/gi, label: "“not just … but …”" },
  { pattern: /, (?:ensuring|enabling|allowing)\b/gi, label: "“…, ensuring …” endings" },
  { pattern: /\s?—\s?/g, label: "em dash (—)" },
  { pattern: /[‐‑‒]/g, label: "non-breaking hyphens (‑) instead of -" },
];

/**
 * The phrase-level tells in `text`: the phrase as written (or a label for
 * structural ones), deduplicated case-insensitively, in order of appearance.
 */
export function findAiTells(text: string): string[] {
  const found: { at: number; value: string }[] = [];
  for (const tell of TELLS) {
    for (const match of text.matchAll(tell.pattern)) {
      found.push({ at: match.index ?? 0, value: tell.label ?? match[0].trim() });
    }
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => f.value)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export interface StyleMetrics {
  sentences: number;
  averageWords: number;
  /** Standard deviation of sentence length, in words: low means monotonous. */
  spread: number;
  shortest: number;
  longest: number;
  /** The first word most sentences share ("I", "The"…), with "I'm" / "I've" counted as "I". */
  commonStart: string;
  /** How many sentences start with it. */
  sameStarts: number;
  /** "A, B and C" lists. One is normal; several read as generated. */
  listsOfThree: number;
  /** Paragraphs in the body. */
  paragraphs: number;
}

/** The letter's body: without the greeting line and the sign-off. */
function body(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").trim().split("\n");
  if (lines[0] && /^(?:dear|hello|hi|to whom)\b/i.test(lines[0].trim())) lines.shift();
  const signOff = lines.findIndex((line) => /^(?:kind|best|warm)?\s*regards,?$|^sincerely,?$|^yours\b/i.test(line.trim()));
  return (signOff >= 0 ? lines.slice(0, signOff) : lines).join(" ");
}

/** "A, B and C" / "A, B, or C" with short items: the rhythm models fall into. */
const LIST_OF_THREE = /[\p{L}\p{N}.+#/-]+(?: [\p{L}\p{N}.+#/-]+){0,3}, [\p{L}\p{N}.+#/-]+(?: [\p{L}\p{N}.+#/-]+){0,3},? (?:and|or) [\p{L}\p{N}.+#/-]+/gu;

/** The body's paragraphs (blocks separated by a blank line), without the greeting and sign-off. */
function paragraphCount(text: string): number {
  const blocks = text.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.filter((b) => !/^(?:dear|hello|hi|to whom)\b[^\n]*,?$/i.test(b) && !/^(?:kind|best|warm)?\s*regards,?\s*\n?[^\n]*$|^sincerely,?/i.test(b)).length;
}

/** Sentence statistics for the letter's body. */
export function styleMetrics(text: string): StyleMetrics {
  // A sentence ends at . ! or ? followed by a space or the end, so "Node.js" and "e.g." mid-sentence don't split it.
  const sentences = body(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /\p{L}/u.test(s));
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const n = lengths.length || 1;
  const averageWords = lengths.reduce((a, b) => a + b, 0) / n;
  const starts = new Map<string, number>();
  for (const sentence of sentences) {
    const first = (sentence.match(/^[\p{L}'’]+/u)?.[0] ?? "").replace(/['’](?:m|ve|d|ll)$/i, "");
    if (first) starts.set(first, (starts.get(first) ?? 0) + 1);
  }
  const [commonStart, sameStarts] = [...starts].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  const spread = Math.sqrt(lengths.reduce((a, b) => a + (b - averageWords) ** 2, 0) / n);
  return {
    sentences: sentences.length,
    averageWords: Math.round(averageWords * 10) / 10,
    spread: Math.round(spread * 10) / 10,
    shortest: lengths.length ? Math.min(...lengths) : 0,
    longest: lengths.length ? Math.max(...lengths) : 0,
    commonStart,
    sameStarts,
    listsOfThree: [...body(text).matchAll(LIST_OF_THREE)].length,
    paragraphs: paragraphCount(text),
  };
}

/** What the statistics say, in plain words — empty when the rhythm reads as a person's. */
export function structuralTells(text: string): string[] {
  const m = styleMetrics(text);
  // A short note has too few sentences to judge; a full letter in a handful of sentences is itself the problem.
  if (m.sentences < 5 && m.sentences * m.averageWords < 120) return [];
  const tells: string[] = [];
  // "I" is how people write letters; only three in four or more opening with it is monotonous. Any other word, sooner.
  if (m.sameStarts / m.sentences > (m.commonStart === "I" ? 0.75 : 0.4)) {
    tells.push(`${m.sameStarts} of ${m.sentences} sentences start with “${m.commonStart}”`);
  }
  if (m.shortest >= 8) tells.push("no short sentences (none under 8 words)");
  if (m.spread < 6.5 && m.averageWords > 14) tells.push(`sentence lengths are very even (about ${Math.round(m.averageWords)} words each)`);
  if (m.averageWords > 24) tells.push(`long sentences (${Math.round(m.averageWords)} words on average)`);
  if (m.listsOfThree >= 2) tells.push(`${m.listsOfThree} lists of three (“A, B and C”)`);
  if (m.paragraphs < 3) tells.push(m.paragraphs <= 1 ? "one block of text: split it into 3 or 4 paragraphs" : "only 2 paragraphs");
  return tells;
}

/**
 * Typography a person typing doesn't produce, replaced by what they would:
 * non-breaking and figure hyphens → "-", non-breaking and thin spaces → " ",
 * zero-width characters removed, "…" → "...". Models emit these (GPT-OSS
 * writes "client‑side" with U+2011); they're a giveaway, and they're outside
 * what the PDF export's fonts can draw.
 */
export function normalizeTypography(text: string): string {
  return text
    .replace(/[‐‑‒−]/g, "-")
    .replace(/[     ]/g, " ")
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/…/g, "...");
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};
const DURATION = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|a few|few|several|many)\+?\s+(?:full\s+)?(years?|months?)\b/gi;

function durations(text: string): { phrase: string; key: string }[] {
  return [...text.matchAll(DURATION)].map((m) => {
    const raw = m[1]!.toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : (NUMBER_WORDS[raw] ?? raw.replace(/^a /, ""));
    return { phrase: m[0], key: `${n} ${m[2]!.toLowerCase().replace(/s$/, "")}` };
  });
}

/**
 * Lengths of time the letter claims ("three years", "18 months") that the
 * applicant's own words don't: models fill in experience from a seniority
 * level. The profile itself holds no durations, so `facts` is what the
 * applicant wrote. Each is returned as written in the letter.
 */
export function unsupportedDurations(letter: string, facts: string): string[] {
  const known = new Set(durations(facts).map((d) => d.key));
  return [...new Set(durations(letter).filter((d) => !known.has(d.key)).map((d) => d.phrase))];
}

/** The words to name in the prompt's "never use" rule — kept in sync with what's checked. */
export const AI_TELL_WORDS = VOCABULARY;
