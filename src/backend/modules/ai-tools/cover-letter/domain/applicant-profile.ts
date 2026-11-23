/**
 * What the AI knows about the applicant: their Jobak profile, read on the
 * server — never sent by the browser, so a letter can only claim what the
 * user really told Jobak.
 */
export interface ApplicantProfile {
  /** From the account (Clerk). Null when the account has none. */
  fullName: string | null;
  /** Skills, tools and domains from preferences (`keywords`). */
  skills: string[];
  /** The titles they search for, first is the main one. */
  targetTitles: string[];
  seniority: "entry" | "mid" | "senior" | "lead" | null;
  /** The catalogue field their titles come from, e.g. "Software Engineering". */
  field: string | null;
  /** Readable: country names, or "anywhere (remote)". */
  locations: string[];
  /** "remote", "hybrid", "on-site". */
  workModes: string[];
}

/** Where the profile comes from. A port, so the use case doesn't depend on the preferences module's shape. */
export interface ApplicantProfileReader {
  forUser(user: { id: string; fullName: string | null }): Promise<ApplicantProfile>;
}
