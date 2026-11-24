/**
 * The contract of `POST /api/v1/ai-tools/hr-email`: an email to HR, a
 * recruiter or a hiring manager, written by the user's own AI. Imports only
 * other shared files (see `src/shared/README.md` for the rule of this folder).
 *
 *   body  HrEmailRequest (JSON)
 *   200   HrEmailResponse
 *   400   { error, code }   a field missing or out of bounds for the purpose, or not a provider
 *   401   { error, code }   nobody is signed in
 *   409   { error, code }   `ai-not-connected`: no saved key for that provider
 *   422   { error, code }   `ai-key-rejected` / `ai-model-unavailable`
 *   429   { error, code }   `rate-limited` (ours) or `ai-provider-limited` (theirs)
 *   503   { error, code }   the provider failed, timed out, or sent no usable email
 *
 * Built on the HR email skill (jobak-net/career-agent-skills, `email-hr/`):
 * one purpose per email, short and natural, the user's facts only. Pasted
 * text written by someone else (a posting, HR's message) is scanned for text
 * planted for AI tools, as for the cover letter.
 */

import type { AiProviderId } from "@/shared/ai";
import type { PostingFinding } from "@/shared/ai-tools";

import type { CvInput } from "./cv-review";

export const HR_EMAIL_API_PATH = "/api/v1/ai-tools/hr-email";

/** What the email is for: the skill's use cases, plus improving the user's own draft. */
export const HR_EMAIL_PURPOSES = [
  "apply",
  "follow-up",
  "reply",
  "interview",
  "thank-you",
  "offer",
  "outreach",
  "referral",
  "rejection",
  "improve",
] as const;
export type HrEmailPurpose = (typeof HR_EMAIL_PURPOSES)[number];

/** The skill's three versions: short and direct, friendly-professional (the default), formal. */
export const HR_EMAIL_TONES = ["short", "friendly", "formal"] as const;
export type HrEmailTone = (typeof HR_EMAIL_TONES)[number];

export const HR_EMAIL_LIMITS = {
  name: 120,
  email: 254,
  company: 120,
  jobTitle: 160,
  posting: 8_000,
  /** HR's message, or the email being replied to. */
  theirMessage: 4_000,
  draft: 4_000,
  notes: 1_500,
} as const;

export interface HrEmailRequest {
  provider: AiProviderId;
  purpose: HrEmailPurpose;
  tone: HrEmailTone;
  /** The name to sign with (the saved name for applications, or the account's). */
  sender: { name: string };
  /** Both optional (""). The address is never invented: it's only used for "Open in email app". */
  recipient: { name: string; email: string };
  job: { company: string; title: string; posting: string };
  context: {
    /** What HR (or the recruiter) wrote, for a reply. */
    theirMessage: string;
    /** The user's own draft, to improve. */
    draft: string;
    /** What the email must say: dates, a salary figure, a point from the interview… */
    notes: string;
  };
  /** Optional: a CV to draw the relevant experience from. Without it, the profile's skills and roles. */
  cv?: CvInput;
}

export interface HrEmailResponse {
  subject: string;
  /** Greeting to signature, plain text. */
  body: string;
  /** What to check or add before sending ("Add the date you applied"). */
  notes: string[];
  provider: AiProviderId;
  model: string;
  /** Phrasing that reads as generated (`findAiTells`), for the user to reword. */
  styleFlags: string[];
  /** What the posting or HR's message hid for AI tools. Empty when clean. */
  postingFindings: PostingFinding[];
  /** Planted words that still made it into the email. Should be empty; checked anyway. */
  plantedWordsInEmail: string[];
  /**
   * Skill-like terms the email states that the user's CV, profile and notes
   * never mention ("PostgreSQL" taken from the posting). Should be empty;
   * checked because a live run claimed one.
   */
  unsupportedSkills: string[];
}
