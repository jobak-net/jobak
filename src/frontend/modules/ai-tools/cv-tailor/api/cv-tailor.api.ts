import { clientFetch, unwrap } from "@/frontend/shared/api";
import {
  CV_TAILOR_ANALYZE_API_PATH,
  CV_TAILOR_API_PATH,
  type CvFitRequest,
  type CvFitResponse,
  type CvTailorRequest,
  type CvTailorResponse,
} from "@/shared/contracts/cv-tailor";

/*************** Mutations ***************/

/**
 * How the CV fits the job, by the user's own AI: `POST /api/v1/ai-tools/cv-tailor/analyze`.
 * Throws an `ApiError` — `ai-not-connected`, `ai-key-rejected`,
 * `ai-provider-limited`, `rate-limited`, or 503 when the AI didn't deliver.
 */
export async function analyzeCvFit(request: CvFitRequest): Promise<CvFitResponse> {
  return unwrap(await clientFetch<CvFitResponse>(CV_TAILOR_ANALYZE_API_PATH, { method: "POST", body: request }));
}

/** The tailored CV after the analysis: `POST /api/v1/ai-tools/cv-tailor`. Throws as `analyzeCvFit` does. */
export async function tailorCv(request: CvTailorRequest): Promise<CvTailorResponse> {
  return unwrap(await clientFetch<CvTailorResponse>(CV_TAILOR_API_PATH, { method: "POST", body: request }));
}
