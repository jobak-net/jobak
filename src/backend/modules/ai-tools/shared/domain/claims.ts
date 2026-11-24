/**
 * Spotting what a model claims for the applicant that their own material
 * never says: a skill the job posting asked for, written into a tailored CV
 * or an application email as if the applicant had it. Checked after every
 * reply, and shown to the user, because prompts alone don't stop it (live
 * runs claimed "PostgreSQL", "CI/CD" and "Agile" for CVs that never mention
 * them).
 */

/** A word without its common endings, so "collaboration" and "collaborated" meet at "collabor". */
export function stem(word: string): string {
  const w = word.toLowerCase();
  const cut = w.replace(/(?:ations?|itions?|ions?|ances?|ences?|ments?|ities|ity|ing|ers?|ed|es|s|al|ly)$/, "");
  return cut.length >= 4 ? cut : w;
}

/**
 * Keywords the tailored CV claims that the original never mentions: a skill
 * possibly claimed for the job's sake. Ignoring case and word endings
 * ("Collaboration" is in a CV that says "collaborated"); a keyword of several
 * words needs each of them. Names with symbols ("CI/CD", "Node.js") are
 * matched as written.
 */
export function keywordsNotIn(keywords: string[], original: string): string[] {
  const text = original.toLowerCase();
  const has = (word: string) => {
    const symbolic = /[^\p{L}\p{N}]/u.test(word);
    const needle = (symbolic ? word.toLowerCase() : stem(word)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\p{L}\\p{N}])${needle}`, "u").test(text);
  };
  return keywords.filter((keyword) => {
    const words = keyword.trim().split(/\s+/).filter(Boolean);
    return words.length > 0 && !words.every(has);
  });
}

/** Words that look like skills but aren't claims: documents, roles, currencies, times. */
const NOT_SKILLS = new Set(["cv", "hr", "qa", "am", "pm", "egp", "usd", "eur", "gbp", "sar", "aed", "id", "ok", "it", "ceo", "cto", "linkedin"]);

/**
 * The skill-like terms an email states that the applicant's material never
 * mentions. Candidates are terms shaped like technology names ("PostgreSQL",
 * "Node.js", "CI/CD", "SQL"), and capitalised words from the job posting used
 * mid-sentence ("Docker"); the company, position and people's names are left
 * out. Each candidate is then looked up in `facts` (the CV or profile, and
 * the user's notes) the way `keywordsNotIn` does.
 */
export function skillsNotIn(email: string, posting: string, facts: string, exclude: string[]): string[] {
  const excluded = new Set(
    exclude.flatMap((value) => value.toLowerCase().split(/[^\p{L}\p{N}.+#]+/u)).filter(Boolean),
  );
  const shaped = email.match(/\b[A-Za-z][A-Za-z0-9]*\.(?:js|ts|net|io)\b|\.NET\b|\b[A-Z][a-z]+[A-Z][A-Za-z0-9]*\b|\b[A-Z]{2,6}(?:\/[A-Z]{2,6})?\b/g) ?? [];
  const postingWords = new Set((posting.match(/\b[A-Z][a-zA-Z0-9+#]{2,}\b/g) ?? []).map((w) => w.toLowerCase()));
  // Capitalised words not at the start of a sentence, that the posting also uses.
  const fromPosting = [...email.matchAll(/(?<![.!?:\n]\s*)(?<=\s)([A-Z][a-zA-Z0-9+#]{2,})\b/g)]
    .map((m) => m[1]!)
    .filter((w) => postingWords.has(w.toLowerCase()));

  const candidates = [...new Set([...shaped, ...fromPosting])].filter((term) => {
    const key = term.toLowerCase();
    return !NOT_SKILLS.has(key) && !excluded.has(key);
  });
  return keywordsNotIn(candidates, facts);
}
