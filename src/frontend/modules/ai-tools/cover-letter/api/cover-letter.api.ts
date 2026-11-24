import { clientFetch, unwrap } from "@/frontend/shared/api";
import {
  COVER_LETTER_API_PATH,
  type CoverLetterRequest,
  type CoverLetterResponse,
} from "@/shared/contracts/cover-letter";

/*************** Mutations ***************/

/**
 * Writes a cover letter with the user's own AI: `POST /api/v1/ai-tools/cover-letter`.
 * Throws an `ApiError` — `ai-not-connected`, `ai-key-rejected`,
 * `ai-provider-limited`, `rate-limited`, or 503 when the AI didn't deliver.
 */
export async function writeCoverLetter(request: CoverLetterRequest): Promise<CoverLetterResponse> {
  return unwrap(await clientFetch<CoverLetterResponse>(COVER_LETTER_API_PATH, { method: "POST", body: request }));
}
