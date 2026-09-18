/**
 * Someone waiting for an invitation.
 *
 * Deliberately not a `User`. A waitlist entry has no password, no session and
 * no verified address — it is an expression of interest, and nothing about it
 * should ever be enough to sign in. Keeping the types apart is what stops that
 * distinction blurring later.
 */

export type WorkPreference = "remote" | "on-site" | "hybrid";

export interface WaitlistEntry {
  id: string;
  email: string;
  field: string | null;
  jobTitles: string[];
  /** ISO-3166-1 alpha-2. */
  countries: string[];
  workPreference: WorkPreference[];
  /** Our own `?ref=` marker, for judging which channel worked. */
  source: string | null;
  /** The browser's Referer. Often absent, never trustworthy. */
  referrer: string | null;
  invitedAt: Date | null;
  createdAt: Date;
}

/** What the sign-up form can set. */
export interface WaitlistSignup {
  email: string;
  field: string | null;
  jobTitles: string[];
  countries: string[];
  workPreference: WorkPreference[];
  source: string | null;
  referrer: string | null;
}
