/**
 * The contract of the CV review tool, two endpoints. Imports only other
 * shared files (see `src/shared/README.md` for the rule of this folder).
 *
 *   POST /api/v1/ai-tools/cv-review          CvReviewRequest  → CvReviewResponse
 *   POST /api/v1/ai-tools/cv-review/improve  CvImproveRequest → CvImproveResponse
 *
 *   400   { error, code }   a field missing or out of bounds, or not a provider
 *   401   { error, code }   nobody is signed in
 *   409   { error, code }   `ai-not-connected`: no saved key for that provider
 *   422   { error, code }   `ai-key-rejected` / `ai-model-unavailable`
 *   429   { error, code }   `rate-limited` (ours) or `ai-provider-limited` (theirs)
 *   503   { error, code }   the provider failed, timed out, or sent no usable answer
 *
 * The CV arrives as text. A PDF or Word file is read in the browser
 * (`cv-review/lib/read-cv-file.ts`): the server never receives a file. The
 * review and the improved version are separate requests, as the CV review
 * skill has it (review first, improve when asked), which also keeps each
 * request inside a free tier's per-minute token limit.
 *
 * Scoring follows the skill's scorecard: eight categories with fixed weights,
 * summing to 100. It's an evaluation framework, not an ATS's own score.
 */

import type { AiProviderId } from "@/shared/ai";

export const CV_REVIEW_API_PATH = "/api/v1/ai-tools/cv-review";
export const CV_IMPROVE_API_PATH = "/api/v1/ai-tools/cv-review/improve";

/** Bounds, shared so the form and the API agree. */
export const CV_REVIEW_LIMITS = {
  /** Shorter than this is a fragment, not a CV. */
  cvMin: 200,
  /** Two full pages of text is about 6,000-8,000 characters; this leaves room. */
  cvMax: 10_000,
  targetRole: 160,
  /** The page limit for an uploaded PDF: recruiters skim, and two pages is the usual ceiling. */
  maxPages: 2,
  maxFileBytes: 5 * 1024 * 1024,
  /** What the improve request may carry back from the review. */
  focusItems: 12,
  focusItemChars: 400,
} as const;

/** The scorecard: the CV review skill's categories and weights (they sum to 100). */
export const CV_CATEGORIES = [
  { id: "summary", label: "Professional summary", max: 10 },
  { id: "experience", label: "Work experience", max: 20 },
  { id: "achievements", label: "Achievements and impact", max: 15 },
  { id: "skills", label: "Skills", max: 15 },
  { id: "ats", label: "ATS compatibility", max: 10 },
  { id: "structure", label: "Structure and readability", max: 10 },
  { id: "language", label: "Language", max: 10 },
  { id: "completeness", label: "Completeness", max: 10 },
] as const;
export type CvCategoryId = (typeof CV_CATEGORIES)[number]["id"];

export type CvRating = "excellent" | "strong" | "good" | "average" | "weak" | "poor";

/** The skill's score ranges. */
export function cvRatingFor(score: number): CvRating {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  if (score >= 60) return "average";
  if (score >= 50) return "weak";
  return "poor";
}

export const CV_RATING_LABEL: Record<CvRating, string> = {
  excellent: "Excellent: highly competitive",
  strong: "Strong: minor improvements needed",
  good: "Good: several things to improve",
  average: "Average: significant improvements recommended",
  weak: "Weak: substantial revision needed",
  poor: "Poor: needs major restructuring",
};

export const AI_WRITING_RATINGS = ["natural", "mostly-natural", "some-ai-patterns", "highly-generic"] as const;
export type AiWritingRating = (typeof AI_WRITING_RATINGS)[number];

/** Where the text came from, so the review can judge how it was extracted. */
export const CV_SOURCES = ["pdf", "docx", "text"] as const;
export type CvSource = (typeof CV_SOURCES)[number];

export interface CvInput {
  /** The CV as plain text: typed, or read from the file in the browser. */
  text: string;
  source: CvSource;
  /** Pages of the uploaded PDF (at most `maxPages`); absent for Word and pasted text. */
  pages?: number;
}

export interface CvReviewRequest {
  /** Which saved key runs it. */
  provider: AiProviderId;
  cv: CvInput;
  /** The role they're aiming for; defaults to the first job title in Preferences. Empty: judged on its own direction. */
  targetRole: string;
}

export interface CvCategoryScore {
  id: CvCategoryId;
  label: string;
  score: number;
  max: number;
  /** One line on why. */
  feedback: string;
}

export interface CvIssue {
  /**
   * The CV's own words this is about, exactly as written, so the page can
   * highlight them. Null for issues about something missing, or when the
   * model's quote wasn't found in the CV (checked on the server).
   */
  quote: string | null;
  issue: string;
  why: string;
  suggestion: string;
  /** 1 critical, 2 important, 3 optional. */
  priority: 1 | 2 | 3;
}

export interface CvReviewResponse {
  provider: AiProviderId;
  model: string;
  /** 0-100: the sum of the categories. */
  score: number;
  rating: CvRating;
  categories: CvCategoryScore[];
  /** Two to four sentences: the overall assessment. */
  summary: string;
  /** What a recruiter likely takes away in the first ten seconds. */
  firstImpression: string;
  /** As the CV presents it, e.g. "Mid-level frontend developer". */
  careerLevel: string;
  strengths: string[];
  weaknesses: string[];
  /** Most important first. */
  issues: CvIssue[];
  ats: {
    checks: { label: string; status: "pass" | "warn" | "fail"; detail: string }[];
    /** Keywords for the target role the CV already supports. */
    keywordsFound: string[];
    /** Ones it doesn't show. Never to be added unless they're true. */
    keywordsMissing: string[];
  };
  aiWriting: {
    rating: AiWritingRating;
    note: string;
    /** Phrases that read as generated, with a plainer alternative. Quotes checked like `issues`. */
    phrases: { quote: string; alternative: string }[];
  };
  /** The target role the review was made for, after the Preferences fallback. Empty when there was none. */
  targetRole: string;
}

export interface CvImproveRequest {
  provider: AiProviderId;
  cv: CvInput;
  targetRole: string;
  /**
   * What the review asked to fix, sent back by the page (the server keeps
   * nothing between requests): the issues' text and suggestions, most
   * important first.
   */
  focus: string[];
  /**
   * The review's score for each category, so the improved CV is scored
   * against the same baseline: one review's 81 and a fresh one's 80 differ by
   * noise, not by the changes.
   */
  originalScores: Record<CvCategoryId, number>;
}

export interface CvImproveResponse {
  provider: AiProviderId;
  model: string;
  /** The improved CV, plain text: headings on their own lines, bullets as "- ". */
  cv: string;
  /** What changed and why. */
  changes: string[];
  /** What couldn't be improved without real information from the user. */
  stillNeeded: string[];
  /** The improved CV re-scored on the same scorecard. */
  score: number;
  categories: CvCategoryScore[];
  /**
   * Numbers in the improved CV that the original doesn't have ("35%",
   * "5,000 users"). Should be empty: the model is told never to invent them,
   * and the server checks, so the user is warned rather than trusting it.
   */
  unsupportedNumbers: string[];
}
