/**
 * The contract of the CV tailoring tool, two endpoints. Imports only other
 * shared files (see `src/shared/README.md` for the rule of this folder).
 *
 *   POST /api/v1/ai-tools/cv-tailor/analyze   CvFitRequest    → CvFitResponse
 *   POST /api/v1/ai-tools/cv-tailor           CvTailorRequest → CvTailorResponse
 *
 *   400   { error, code }   a field missing or out of bounds, or not a provider
 *   401   { error, code }   nobody is signed in
 *   409   { error, code }   `ai-not-connected`: no saved key for that provider
 *   422   { error, code }   `ai-key-rejected` / `ai-model-unavailable`
 *   429   { error, code }   `rate-limited` (ours) or `ai-provider-limited` (theirs)
 *   503   { error, code }   the provider failed, timed out, or sent no usable answer
 *
 * Built on the CV tailoring skill (jobak-net/career-agent-skills,
 * `cv-tailor/`): analyse the posting against the CV first (the match, each
 * requirement and the CV's evidence for it), then write the tailored CV when
 * the user asks. The CV arrives as text (a file is read in the browser). The
 * posting is scanned for text planted for AI tools before a model sees it,
 * as for the cover letter.
 */

import type { AiProviderId } from "@/shared/ai";
import type { PostingFinding } from "@/shared/ai-tools";

import type { CvInput } from "./cv-review";

export const CV_TAILOR_ANALYZE_API_PATH = "/api/v1/ai-tools/cv-tailor/analyze";
export const CV_TAILOR_API_PATH = "/api/v1/ai-tools/cv-tailor";

export const CV_TAILOR_LIMITS = {
  company: 120,
  jobTitle: 160,
  descriptionMin: 80,
  /**
   * Lower than the cover letter's: the CV (up to 10,000 characters) goes in
   * the same request, and both together must fit a free tier's per-minute
   * token limit.
   */
  descriptionMax: 8_000,
  /** What the tailor request may carry back from the analysis. */
  focusItems: 14,
  focusItemChars: 300,
} as const;

/** The skill's match rubric: six categories with fixed weights, summing to 100. */
export const FIT_CATEGORIES = [
  { id: "technical", label: "Technical skills", max: 30 },
  { id: "experience", label: "Relevant experience", max: 25 },
  { id: "responsibilities", label: "Responsibilities", max: 20 },
  { id: "qualifications", label: "Required qualifications", max: 15 },
  { id: "domain", label: "Industry and domain", max: 5 },
  { id: "preferred", label: "Preferred qualifications", max: 5 },
] as const;
export type FitCategoryId = (typeof FIT_CATEGORIES)[number]["id"];

export type FitRating = "excellent" | "strong" | "good" | "moderate" | "weak" | "mismatch";

/** The skill's score ranges. */
export function fitRatingFor(score: number): FitRating {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  if (score >= 60) return "moderate";
  if (score >= 50) return "weak";
  return "mismatch";
}

export const FIT_RATING_LABEL: Record<FitRating, string> = {
  excellent: "Excellent match",
  strong: "Strong match",
  good: "Good match",
  moderate: "Moderate match",
  weak: "Weak match",
  mismatch: "Significant mismatch",
};

export const REQUIREMENT_PRIORITIES = ["high", "medium", "low"] as const;
export const REQUIREMENT_TYPES = ["essential", "important", "preferred", "contextual"] as const;
export const REQUIREMENT_MATCHES = ["strong", "partial", "missing", "transferable"] as const;

export interface TailorJob {
  /** Optional: the posting usually names it. Used in the prompt and the file name. */
  company: string;
  /** Optional, as `company`. */
  title: string;
  /** The posting as pasted. Scanned for planted AI traps before a model sees it. */
  description: string;
}

export interface CvFitRequest {
  provider: AiProviderId;
  cv: CvInput;
  job: TailorJob;
}

export interface FitCategoryScore {
  id: FitCategoryId;
  label: string;
  score: number;
  max: number;
  feedback: string;
}

export interface JobRequirement {
  requirement: string;
  priority: (typeof REQUIREMENT_PRIORITIES)[number];
  type: (typeof REQUIREMENT_TYPES)[number];
  /** How the CV meets it: shown directly, partly, not at all, or through related experience. */
  match: (typeof REQUIREMENT_MATCHES)[number];
  /** The CV's own words that show it, checked on the server; null when there are none or the quote wasn't found. */
  evidence: string | null;
  /** One line on why. */
  note: string;
}

export interface CvFitResponse {
  provider: AiProviderId;
  model: string;
  /** 0-100: the sum of the categories. An estimate, not an ATS score or a hiring probability. */
  score: number;
  rating: FitRating;
  categories: FitCategoryScore[];
  /** Two to four sentences: how the CV fits this job, and why. */
  summary: string;
  /** A truthful headline for this application, e.g. "Software Engineer with a frontend background". */
  positioning: string;
  /** The posting's requirements, most important first, each matched against the CV. */
  requirements: JobRequirement[];
  strengths: string[];
  gaps: string[];
  /** What the posting hid for AI tools (see `scanJobPosting`). Empty for a clean posting. */
  postingFindings: PostingFinding[];
}

export interface CvTailorRequest {
  provider: AiProviderId;
  cv: CvInput;
  job: TailorJob;
  /**
   * What the analysis found, sent back by the page (the server keeps nothing
   * between requests): the positioning and the requirements with how the CV
   * meets each, most important first.
   */
  focus: string[];
  /** The analysis's score per category, so the tailored CV is scored against the same baseline. */
  originalScores: Record<FitCategoryId, number>;
}

export interface CvTailorResponse {
  provider: AiProviderId;
  model: string;
  /** The tailored CV, plain text: headings on their own lines, bullets as "- ". */
  cv: string;
  /** What was emphasised, reordered, rewritten or shortened. */
  changes: string[];
  /** The posting's keywords the tailored CV now uses, each one the original supports. */
  keywords: string[];
  /** Requirements the CV still doesn't show. Not hidden: the skill's rule. */
  gaps: string[];
  /** Beyond the CV: a project, a portfolio, what to prepare. */
  recommendations: string[];
  /** The tailored CV re-scored on the same rubric. */
  score: number;
  categories: FitCategoryScore[];
  /** Numbers the tailored CV states that the original doesn't. Should be empty; checked anyway. */
  unsupportedNumbers: string[];
  /** Keywords it lists that the original CV never mentions: possibly a skill claimed for the job's sake. */
  unsupportedKeywords: string[];
  /** Words the posting planted for AI tools that made it into the CV. Should be empty; checked anyway. */
  plantedWordsInCv: string[];
}
