/**
 * The contract of `POST /api/v1/ai-tools/cover-letter`: a cover letter for one
 * job, written by the user's own AI from their Jobak profile. Imports only
 * other shared files (see `src/shared/README.md` for the rule of this folder).
 *
 *   body  CoverLetterRequest (JSON)
 *   200   CoverLetterResponse
 *   400   { error, code }   a field missing or out of bounds, or not a provider
 *   401   { error, code }   nobody is signed in
 *   409   { error, code }   `ai-not-connected`: no saved key for that provider
 *   422   { error, code }   `ai-key-rejected`: the provider refused the saved key
 *   429   { error, code }   `rate-limited` (ours) or `ai-provider-limited` (theirs)
 *   503   { error, code }   the provider failed, timed out, or sent no usable letter
 *
 * The provider is the one the user picked in the tool's popup, from their
 * saved keys. Nothing about the user's profile is sent: the server reads it
 * (skills, target roles, seniority, location) and presents the applicant as
 * their first target role. `applicant` carries the name, which the user may
 * change in the form, and optionally what they've done in their own words.
 */

import type { AiProviderId } from "@/shared/ai";
import type { PostingFinding } from "@/shared/ai-tools";

export const COVER_LETTER_API_PATH = "/api/v1/ai-tools/cover-letter";

export const COVER_LETTER_TONES = ["professional", "warm", "confident", "concise"] as const;
export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

/** Field bounds, shared so the form and the API agree. */
export const COVER_LETTER_LIMITS = {
  name: 120,
  company: 120,
  jobTitle: 160,
  /** Long enough for a full posting; short enough to keep the prompt cheap. */
  descriptionMin: 80,
  descriptionMax: 12_000,
  /** A few lines up to a whole CV (it can start from a saved one): the CV tools' limit. */
  experienceMax: 10_000,
} as const;

export interface CoverLetterRequest {
  /** Which saved key writes it. */
  provider: AiProviderId;
  /** Shown in the form, defaulting to the account's name; the user may change it for this letter. */
  applicant: {
    name: string;
    /**
     * Optional: what they've done, in their own words (a few lines, or their
     * CV). The letter is built on its concrete details and borrows its
     * phrasing, which is what makes a letter read as theirs.
     */
    experience?: string;
  };
  job: {
    company: string;
    title: string;
    /** The posting as pasted. Scanned for planted AI traps before a model sees it. */
    description: string;
  };
  tone: CoverLetterTone;
}

export interface CoverLetterResponse {
  /** The letter, plain text, paragraphs separated by blank lines. */
  letter: string;
  /** Who wrote it, for the result's caption. */
  provider: AiProviderId;
  model: string;
  /** The user's skills that the posting also asks for: what the letter was built around. */
  matchedSkills: string[];
  /** What the posting hid for AI tools (see `scanJobPosting`). Empty for a clean posting. */
  postingFindings: PostingFinding[];
  /**
   * Planted words that still made it into the letter. Should be empty — the
   * model is told to leave them out — and is checked after, so the user is
   * warned rather than trusting the model.
   */
  plantedWordsInLetter: string[];
  /**
   * What still reads as machine-written after the humanizing edit: stock
   * phrasing ("Signs of AI writing": "leverage", "deep understanding", em
   * dashes…) and rhythm ("9 of 13 sentences start with I…", "sentence lengths
   * are very even"). For the user to fix in their own words.
   */
  styleFlags: string[];
}
