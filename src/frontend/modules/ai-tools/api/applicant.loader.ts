import "server-only";

import { serverFetch } from "@/frontend/shared/api/server";
import { APPLICANT_API_PATH, type ApplicantResponse } from "@/shared/contracts/applicant";

/**
 * The name and saved CVs the AI tools start from (`GET /api/v1/applicant`).
 * Null when they can't be read (e.g. before migration 025 is applied): the
 * tools then work as before, asking for both.
 */
export async function loadApplicant(): Promise<ApplicantResponse | null> {
  const result = await serverFetch<ApplicantResponse>(APPLICANT_API_PATH);
  return result.kind === "ok" ? result.data : null;
}
