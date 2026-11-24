import type { HrEmailPurpose, HrEmailTone } from "@/shared/contracts/hr-email";

export interface PurposeConfig {
  label: string;
  /** Which fields the form shows for it; the rest are hidden and sent empty. */
  fields: {
    job: boolean;
    posting: boolean;
    theirMessage: boolean;
    draft: boolean;
    cv: boolean;
  };
  /** What "What to say" asks for, as its placeholder. */
  notesHint: string;
  /** Required besides the name (mirrors the API's checks). */
  requires?: "theirMessage" | "draft" | "notes";
}

/** What the form shows for each purpose: only what that email needs. */
export const PURPOSES: Record<HrEmailPurpose, PurposeConfig> = {
  apply: {
    label: "Apply for a job",
    fields: { job: true, posting: true, theirMessage: false, draft: false, cv: true },
    notesHint: "Anything to mention: where you saw the job, a referral, when you can start…",
  },
  "follow-up": {
    label: "Follow up",
    fields: { job: true, posting: false, theirMessage: false, draft: false, cv: false },
    notesHint: "What you're following up on: when you applied, an interview, an assessment you sent…",
  },
  reply: {
    label: "Reply to HR",
    fields: { job: true, posting: false, theirMessage: true, draft: false, cv: false },
    notesHint: "Your answers to what they asked: your expected salary, notice period, when you're free…",
    requires: "theirMessage",
  },
  interview: {
    label: "About an interview",
    fields: { job: true, posting: false, theirMessage: true, draft: false, cv: false },
    notesHint: "Confirm it, ask to reschedule (and when you're free instead), or ask about the format or link…",
  },
  "thank-you": {
    label: "Thank you after an interview",
    fields: { job: true, posting: false, theirMessage: false, draft: false, cv: false },
    notesHint: "Something you talked about that you'd like to mention…",
  },
  offer: {
    label: "Salary or offer",
    fields: { job: true, posting: false, theirMessage: true, draft: false, cv: false },
    notesHint: "The offer, and what you'd like to ask: a salary figure, remote days, start date…",
    requires: "notes",
  },
  outreach: {
    label: "Reach out to a recruiter",
    fields: { job: true, posting: true, theirMessage: false, draft: false, cv: true },
    notesHint: "What you're looking for, or the role you saw…",
  },
  referral: {
    label: "Ask for a referral",
    fields: { job: true, posting: true, theirMessage: false, draft: false, cv: true },
    notesHint: "How you know them, and the role you'd like a referral for…",
  },
  rejection: {
    label: "After a rejection",
    fields: { job: true, posting: false, theirMessage: true, draft: false, cv: false },
    notesHint: "Whether you'd like feedback, or to be considered for other roles…",
  },
  improve: {
    label: "Improve my draft",
    fields: { job: false, posting: false, theirMessage: false, draft: true, cv: false },
    notesHint: "Anything to change: shorter, more formal, add something…",
    requires: "draft",
  },
};

export const TONE_LABEL: Record<HrEmailTone, string> = {
  short: "Short and direct",
  friendly: "Friendly",
  formal: "Formal",
};
