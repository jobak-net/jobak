import type { NewCv, SavedCvRecord } from "./saved-cv";

/**
 * Where the applicant's name and CVs are kept: Postgres today
 * (`PgApplicantRepository`: `user_preferences.applicant_name`, `user_cvs`).
 */
export interface ApplicantRepository {
  /** The name they write on applications; null when they haven't given one. */
  name(userId: string): Promise<string | null>;
  /** Saves it. False when the user has no preferences row yet (before onboarding). */
  setName(userId: string, name: string): Promise<boolean>;
  /** Their CVs, most recently used first. */
  listCvs(userId: string): Promise<SavedCvRecord[]>;
  /**
   * Saves a CV, or moves the same text to the top when it's already there
   * (its label stays as first saved), then keeps only the `keep` most
   * recently used. One transaction.
   */
  saveCv(userId: string, cv: NewCv, keep: number): Promise<SavedCvRecord>;
  /** Deletes one of their CVs. False when there's no such CV of theirs. */
  deleteCv(userId: string, id: string): Promise<boolean>;
}
