import { findAiTells, normalizeTypography, plantedWordsIn, styleMetrics, unsupportedDurations } from "@/shared/ai-tools";

/**
 * The second pass, sentence by sentence: every sentence of the body goes back
 * to the model to be reworded, the flagged ones with what's wrong with them,
 * and each replacement is kept or dropped on its own.
 *
 * Why every sentence: a draft with no stock phrase left still read as
 * machine-written. Models pick the most expected word each time, and
 * detectors measure exactly that. The version the user held up as the target
 * kept every fact and changed the wording: "making accessible" →
 * "democratizing", "work with" → "cooperate with", a tense shift ("JavaScript
 * was always one of the technologies I used"). It reads as a fluent
 * professional writing in a second language: correct, plain, and not the
 * first phrasing that comes to mind.
 *
 * It replaced a whole-letter rewrite. On GPT-OSS within Groq's free tier
 * that rewrite was the weak step: at low reasoning it wrote broken phrases
 * ("contribute reliable code from day one and reliability") and merged
 * sentences into 50-word ones; at medium it thought until it ran out of
 * tokens and returned nothing, or hit the per-minute token limit. A few
 * sentences are a small, cheap task, and a bad replacement costs only itself.
 */

/** A sentence of the letter's body, as written, and what the checks found in it. */
export interface FlaggedSentence {
  sentence: string;
  problems: string[];
}

const GREETING = /^(?:dear|hello|hi|to whom|good (?:morning|afternoon))\b/i;
const SIGN_OFF = /^(?:kind|best|warm)?\s*regards,?$|^sincerely,?$|^yours\b/i;
/** Over this many words, a sentence is flagged as too long. */
const LONG_SENTENCE = 28;
/** A letter's body is 10-18 sentences; past this the rest stays as drafted. */
const MAX_SENTENCES = 24;

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** The body's sentences as they appear in the letter (greeting and sign-off left out). */
export function sentencesOf(letter: string): string[] {
  const lines = letter.replace(/\r\n?/g, "\n").split("\n");
  const signOff = lines.findIndex((line) => SIGN_OFF.test(line.trim()));
  return (signOff >= 0 ? lines.slice(0, signOff) : lines)
    .filter((line) => line.trim() && !GREETING.test(line.trim()))
    .flatMap((line) => line.trim().split(/(?<=[.!?])\s+/))
    .filter((sentence) => /\p{L}/u.test(sentence));
}

/**
 * Every sentence of the body, with what the checks found in it: stock
 * phrasing (`findAiTells`), a length of time the applicant never stated, or
 * over `LONG_SENTENCE` words, plus, when the letter has no short sentence at
 * all, a note on its longest one, to split. Most have no problem: they're
 * reworded only.
 */
export function reviewSentences(letter: string, facts: string): FlaggedSentence[] {
  const sentences = sentencesOf(letter).slice(0, MAX_SENTENCES);
  // One "A, B and C" is normal; when the letter has several, each one is flagged.
  const manyLists = styleMetrics(letter).listsOfThree >= 2;
  const reviewed = sentences.map((sentence) => ({
    sentence,
    problems: [
      ...findAiTells(sentence).map((tell) => `stock phrasing: ${tell}`),
      ...unsupportedDurations(sentence, facts).map((d) => `"${d}" was never stated by the applicant: remove it`),
      ...(words(sentence) > LONG_SENTENCE ? [`too long (${words(sentence)} words): split it`] : []),
      ...(manyLists && styleMetrics(sentence).listsOfThree > 0
        ? ["a list of three: keep only the one or two items that matter for this job"]
        : []),
    ],
  }));

  // No short sentence anywhere: the two longest each give one up.
  if (reviewed.length > 0 && reviewed.every((r) => words(r.sentence) >= 8)) {
    const longest = [...reviewed].sort((a, b) => words(b.sentence) - words(a.sentence)).slice(0, 2);
    for (const r of longest) {
      if (!r.problems.some((p) => p.startsWith("too long"))) {
        r.problems.push("the letter has no short sentence: split this into a short sentence (under 8 words) and the rest");
      }
    }
  }
  return reviewed;
}

/** The system prompt and user message for rewording the sentences. */
export function buildRevisionPrompt(
  letter: string,
  sentences: FlaggedSentence[],
  plantedWords: string[],
  /** Everything the applicant actually told Jobak: their own words, title and skills. */
  facts: string,
): { system: string; user: string } {
  const forbidden = plantedWords.length
    ? `\n- Never use these words or phrases, in any form: ${plantedWords.map((w) => `"${w}"`).join(", ")}.`
    : "";

  const system = `You are an editor. You reword a cover letter sentence by sentence, so it reads as written by a fluent professional for whom English is a second language: correct, formal and plain, but never the most expected phrasing.

For every numbered sentence:
- say the same thing with different words and a different structure than the original. Avoid the first wording that comes to mind: "work with" can be "cooperate with", "allow me to" can be "enable me to", "manage code changes" can be "version control of my projects";
- vary tense where the meaning allows ("JavaScript was always one of the technologies I used");
- some sentences may open with a connector ("In addition,", "As a …,", "While", "Although");
- when the sentence comes with "Fix:", fix that too;
- keep the meaning exactly. Never make a claim stronger: "maintain" stays "maintain" (not "oversee"), one service stays one service, "integrated APIs" doesn't become "built APIs";
- a claim about the applicant's own work (a project, a task, a habit, a colleague, a result) that isn't in <facts> was made up by the first draft: leave it out of the reworded sentence, and if nothing is left, write [delete]. A skill listed in <facts> is something they know, not a project. For example, with facts "I integrate APIs. Skills: React", the sentence "I built a complete dashboard in React and worked with backend engineers on data consistency" becomes "I integrate APIs into the React pages I work on";
- add nothing: no tools, numbers, years, projects or claims;
- the applicant stays the one doing things: no passive voice ("Git is employed by me");
- about the same length, unless "Fix:" asks to split. Correct grammar. No slang, no em dashes, no stock phrases ("I am excited", "eager", "keen to contribute", "aligns with", "resonates with", "how my experience can contribute", "best practices").${forbidden}

Reply with exactly one numbered line per sentence, in the same order and with the same numbers, and nothing else. If you split a sentence in two, keep both on its one line:
1. <the reworded sentence>
2. <…>`;

  const user = `<facts>
${facts.trim() || "(only the job title and skills below)"}
</facts>

<letter>
${letter}
</letter>

Sentences:
${sentences
  .map((s, i) => `${i + 1}. "${s.sentence}"${s.problems.length > 0 ? `\n   Fix: ${s.problems.join("; ")}.` : ""}`)
  .join("\n")}`;

  return { system, user };
}

/** The numbered lines of the reply: index → text (`null` for [delete]). */
function readNumberedLines(reply: string): Map<number, string | null> {
  const lines = new Map<number, string | null>();
  for (const raw of reply.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^\s*(\d{1,2})[.)]\s+(.+?)\s*$/.exec(raw);
    if (!match) continue;
    const text = match[2]!.replace(/^["“]|["”]$/g, "").trim();
    lines.set(Number(match[1]) - 1, /^\[?delete\]?$/i.test(text) ? null : text);
  }
  return lines;
}

/** Words that carry no content, left out when comparing a sentence with its replacement. */
const STOPWORDS = new Set(
  ("the a an and or but of to in on for with at by from as is are was were be been being have has had do does did " +
    "i me my mine we our you your it its this that these those there their they them he she his her not no so than " +
    "too very can could would should will just also into about over under while although though because which who " +
    "what when where how am im ive id").split(" "),
);

function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/['’]/g, "")
      .split(/[^\p{L}\p{N}+#.]+/u)
      .map((w) => w.replace(/\.+$/, ""))
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

/**
 * Whether a replacement is about the same thing as the sentence it replaces:
 * enough of the original's content words (names, tools, nouns) survive. A
 * rewording changes most words but keeps "product", "design", "REST",
 * "Git"…; a line answering a different sentence keeps almost none.
 */
function sameSubject(original: string, replacement: string): boolean {
  const before = contentWords(original);
  if (before.size < 3) return true;
  const after = contentWords(replacement);
  const shared = [...before].filter((w) => after.has(w)).length;
  return shared / before.size >= 0.25;
}

/**
 * The letter with the replacements that pass, each judged alone. A
 * replacement is kept when it's non-empty and at most twice as long, is about
 * the same thing as its sentence (`sameSubject`), adds no planted word, has
 * no more stock phrasing than the sentence it replaces, and claims no
 * duration the applicant didn't state. A deletion is kept when the letter
 * stays at least 70% of its length.
 *
 * When most lines aren't about their sentence, the numbering slipped (the
 * model split a sentence across two lines, and every later line answers the
 * one before it): nothing is applied.
 */
export function applyRevisions(
  letter: string,
  flagged: FlaggedSentence[],
  reply: string,
  plantedWords: string[],
  facts: string,
): { letter: string; kept: number; dropped: string[] } {
  const lines = readNumberedLines(reply);
  const offSubject = flagged.filter((f, i) => {
    const line = lines.get(i);
    return typeof line === "string" && !sameSubject(f.sentence, line);
  }).length;
  if (offSubject > flagged.length / 3) {
    return { letter, kept: 0, dropped: [`the reply's numbering doesn't match the sentences (${offSubject} of ${flagged.length} off)`] };
  }

  let revised = letter;
  let kept = 0;
  const dropped: string[] = [];

  flagged.forEach((f, i) => {
    if (!lines.has(i)) return void dropped.push(`${i + 1}: no line for it`);
    const replacement = lines.get(i) as string | null;

    if (replacement === null) {
      const without = revised.replace(f.sentence, "").replace(/ {2,}/g, " ").replace(/ +\n/g, "\n");
      if (without.length < letter.length * 0.7) return void dropped.push(`${i + 1}: deleting it cuts too much`);
      revised = without;
      kept++;
      return;
    }

    const text = normalizeTypography(replacement).replace(/\s*[—–]\s*/g, ", ");
    const reason =
      words(text) === 0 || text.length > f.sentence.length * 2
        ? "length"
        : !sameSubject(f.sentence, text)
          ? "not about the same thing"
          : plantedWordsIn(text, plantedWords).length > plantedWordsIn(f.sentence, plantedWords).length
          ? "a planted word"
          : findAiTells(text).length > 0 && findAiTells(text).length >= findAiTells(f.sentence).length
            ? `still stock phrasing (${findAiTells(text).join(", ")})`
            : unsupportedDurations(text, facts).length > 0
              ? "a duration never stated"
              : !revised.includes(f.sentence)
                ? "sentence not found"
                : null;
    if (reason) return void dropped.push(`${i + 1}: ${reason}`);
    revised = revised.replace(f.sentence, text);
    kept++;
  });

  return { letter: revised.replace(/\n{3,}/g, "\n\n").trim(), kept, dropped };
}
