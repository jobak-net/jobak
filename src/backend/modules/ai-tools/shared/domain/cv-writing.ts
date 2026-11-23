import { AI_TELL_WORDS } from "@/shared/ai-tools";
import type { CvInput } from "@/shared/contracts/cv-review";

/**
 * What every CV the tools rewrite (CV review's improved CV, CV tailoring's
 * tailored CV) must follow, in the prompts' words. Each rule is here because
 * a live run broke it: invented years ("over 3 years" for a CV whose dates
 * said five), embellished bullets ("ensuring cross-browser compatibility"),
 * an AOL address "professionalised" to "<personal-domain>", empty
 * "(Details to be provided)" sections. The checks after the reply
 * (`restoreContactDetails`, `unsupportedNumbers`, `tidyCvText`) catch what
 * still gets through.
 */

/** The language a CV is written in. */
export const PLAIN_LANGUAGE = `Plain, natural professional language: what a competent person would write about their actual work. "Built a reusable authentication component used across three applications", not "Leveraged cutting-edge technologies to facilitate seamless authentication experiences". No buzzwords, empty adjectives or inflated verbs (spearheaded, orchestrated, leveraged, utilized, synergized). These words read as generated: ${AI_TELL_WORDS.join(", ")}.`;

/** What a rewrite may never change or add. */
export const CV_FACT_RULES = `- The original CV is the source of truth. Keep every employer, job title, date, degree, certification, technology and link exactly as it is. Never invent experience, responsibilities, achievements, metrics, numbers, skills, dates or leadership.
- Copy the name and every contact detail (email, phone, links, location) character for character. Never change, "professionalise" or replace them, not even an old-fashioned email domain, and never write a slot such as <personal-domain>.
- Never state a total number of years of experience: the dates say it, and a count is easy to get wrong.
- A bullet says what the original says (what was done, for whom, with what), more clearly, and nothing more: no new causes, scopes, results, qualities, teams or tools ("ensuring cross-browser compatibility", "for regression testing", "with backend teams"). A tool from the Skills list doesn't belong in a bullet the original didn't put it in.
- Where a real result would make a bullet stronger and the CV doesn't give one, write the bullet without it and list the question as still needed. Never a placeholder such as [X%].`;

/** How a rewritten CV is laid out. */
export const CV_FORMAT_RULES = `- ATS-friendly plain text, laid out like this: the name on the first line; a headline on the second (the applicant's role as the CV states it, or the truthful positioning for this job); then the contact details as in the original, on one or two lines joined with " | ". Then standard headings on their own lines (Summary, Experience, Projects, Education, Certifications, Skills, Languages).
- Each job, project or degree starts with one line: "<Company or school> | <Job title or degree> | <dates as the original writes them>", then its bullets as "- ". No markdown, tables, icons, columns or em dashes (use a comma or a new line).
- Only sections the original has content for. Never add an empty section or a placeholder ("(Details to be provided)", "[Add project]").
- About the same length as the original, never more than two pages.
- Write in the language of the original CV.`;

const SOURCE: Record<CvInput["source"], string> = {
  pdf: "read from a PDF in the browser; this text is what an ATS would extract",
  docx: "read from a Word file in the browser; this text is what an ATS would extract",
  text: "pasted by the user as plain text, so layout and extraction can't be judged",
};

/** Where the CV's text came from, for a prompt. */
export const cvSourceNote = (cv: CvInput) => SOURCE[cv.source];

/** The CV for a prompt, marked as the applicant's document. */
export function cvBlock(cv: CvInput): string {
  const pages = cv.pages ? `, ${cv.pages} page${cv.pages === 1 ? "" : "s"}` : "";
  return `<cv source="${cv.source}${pages}">
${cv.text.trim()}
</cv>`;
}
