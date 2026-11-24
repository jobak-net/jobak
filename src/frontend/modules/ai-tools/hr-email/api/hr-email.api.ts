import { clientFetch, unwrap } from "@/frontend/shared/api";
import { HR_EMAIL_API_PATH, type HrEmailRequest, type HrEmailResponse } from "@/shared/contracts/hr-email";

/*************** Mutations ***************/

/**
 * Writes an email to HR with the user's own AI: `POST /api/v1/ai-tools/hr-email`.
 * Throws an `ApiError` — `ai-not-connected`, `ai-key-rejected`,
 * `ai-provider-limited`, `rate-limited`, or 503 when the AI didn't deliver.
 */
export async function writeHrEmail(request: HrEmailRequest): Promise<HrEmailResponse> {
  return unwrap(await clientFetch<HrEmailResponse>(HR_EMAIL_API_PATH, { method: "POST", body: request }));
}
