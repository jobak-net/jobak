/**
 * The contract of the applicant endpoints: the name and CVs a user applies
 * with, asked once and kept for every AI tool. Imports only other shared
 * files (see `src/shared/README.md`).
 *
 *   GET    /api/v1/applicant              → ApplicantResponse
 *   PUT    /api/v1/applicant/name         UpdateApplicantNameRequest → { name }
 *   POST   /api/v1/applicant/cvs          SaveCvRequest → SavedCv
 *   DELETE /api/v1/applicant/cvs/[id]     → { deleted: true }
 *
 *   400  { error, code }   a field missing or out of bounds
 *   401  { error, code }   nobody is signed in
 *   404  { error, code }   no such CV (or not the user's), or no preferences yet (name)
 *   429  { error, code }   `rate-limited`
 *
 * CVs are stored as text (a file is read in the browser; the server never
 * gets one). The 5 most recently used are kept; saving a text that's already
 * there just moves it to the top.
 */

import { CV_REVIEW_LIMITS, type CvInput, type CvSource } from "./cv-review";

export const APPLICANT_API_PATH = "/api/v1/applicant";
export const APPLICANT_NAME_API_PATH = "/api/v1/applicant/name";
export const APPLICANT_CVS_API_PATH = "/api/v1/applicant/cvs";
export const applicantCvApiPath = (id: string) => `${APPLICANT_CVS_API_PATH}/${encodeURIComponent(id)}`;

export const APPLICANT_LIMITS = {
  name: 120,
  label: 120,
  /** How many CVs are kept per user: the most recently used. */
  savedCvs: 5,
  cvMin: CV_REVIEW_LIMITS.cvMin,
  cvMax: CV_REVIEW_LIMITS.cvMax,
} as const;

export interface SavedCv {
  id: string;
  /** The file's name, or "Pasted CV". */
  label: string;
  source: CvSource;
  /** A PDF's pages; null for Word and pasted text. */
  pages: number | null;
  text: string;
  /** ISO dates. */
  createdAt: string;
  lastUsedAt: string;
}

export interface ApplicantResponse {
  /** The name the user writes on applications; null until they've given one (use the account's). */
  name: string | null;
  /** Most recently used first. */
  cvs: SavedCv[];
}

export interface UpdateApplicantNameRequest {
  name: string;
}

export interface SaveCvRequest {
  label: string;
  cv: CvInput;
}
