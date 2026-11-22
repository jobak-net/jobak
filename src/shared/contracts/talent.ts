/**
 * The contract of `GET /api/v1/talent`: the opt-in talent directory, public.
 * Imports nothing (see `src/shared/README.md`).
 *
 *   200  TalentCard[]   newest first; only people who published themselves
 *   503  { error }      couldn't read the directory
 *
 * Every field is what the owner chose to show — a hidden one is `null`, not
 * left out — and nobody's email is ever part of it.
 */

export const TALENT_API_PATH = "/api/v1/talent";

export interface TalentCard {
  slug: string;
  displayName: string | null;
  headline: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  location: string | null;
  field: string | null;
  skills: string[] | null;
  experienceYears: number | null;
  seniority: string | null;
  /** Work arrangements, as stored: `remote`, `on-site`, `hybrid`. */
  openTo: string[] | null;
}
