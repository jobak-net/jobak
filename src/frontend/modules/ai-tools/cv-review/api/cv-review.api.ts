import { clientFetch, unwrap } from "@/frontend/shared/api";
import {
  CV_IMPROVE_API_PATH,
  CV_REVIEW_API_PATH,
  type CvImproveRequest,
  type CvImproveResponse,
  type CvReviewRequest,
  type CvReviewResponse,
} from "@/shared/contracts/cv-review";

/*************** Mutations ***************/

/**
 * Reviews a CV with the user's own AI: `POST /api/v1/ai-tools/cv-review`.
 * Throws an `ApiError` — `ai-not-connected`, `ai-key-rejected`,
 * `ai-provider-limited`, `rate-limited`, or 503 when the AI didn't deliver.
 */
export async function reviewCv(request: CvReviewRequest): Promise<CvReviewResponse> {
  return unwrap(await clientFetch<CvReviewResponse>(CV_REVIEW_API_PATH, { method: "POST", body: request }));
}

/** The improved CV after a review: `POST /api/v1/ai-tools/cv-review/improve`. Throws as `reviewCv` does. */
export async function improveCv(request: CvImproveRequest): Promise<CvImproveResponse> {
  return unwrap(await clientFetch<CvImproveResponse>(CV_IMPROVE_API_PATH, { method: "POST", body: request }));
}
