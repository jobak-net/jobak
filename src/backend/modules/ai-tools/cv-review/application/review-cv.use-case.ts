import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { cvRatingFor, type CvReviewRequest, type CvReviewResponse } from "@/shared/contracts/cv-review";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import type { ApplicantProfileReader } from "../../shared/domain/applicant-profile";
import { buildReviewPrompt, readReviewReply } from "../domain/cv-review-prompt";

/**
 * The ceiling: the review is a few hundred words of JSON plus a reasoning
 * model's thinking. Not much higher: Groq's free tier allows 8,000 tokens a
 * minute on GPT-OSS, and the ceiling appears to be counted up front against
 * it, along with the CV (up to about 2,800 tokens) and the prompt.
 */
const MAX_TOKENS = 3500;
/** When the review thinks through its whole ceiling, one retry thinking less. */
const RETRY_MAX_TOKENS = 2500;

/**
 * `POST /api/v1/ai-tools/cv-review`: a scored review of the user's CV, by
 * their own AI, following the CV review skill's scorecard.
 *
 *   1. the CV arrives as text: a file was read in the browser
 *      (`ai-tools/shared/lib/read-cv-file.ts`), the server never gets one;
 *   2. the target role is the one in the form, else the first job title in
 *      Preferences, else none (judged on its own direction);
 *   3. one call at medium reasoning; a reply that hits the ceiling with no
 *      answer is retried once at low;
 *   4. the reply is checked (`readReviewReply`): scores clamped and summed,
 *      quotes looked up in the CV so the page only highlights real ones.
 *
 * Throws what `clientForUser` and `AiClient.complete` throw (`ai-not-connected`,
 * `ai-key-rejected`, `ai-model-unavailable`, `ai-provider-limited`,
 * `rate-limited`, 503), plus a 503 when the reply has no usable review.
 */
export class ReviewCvUseCase {
  constructor(
    private readonly profiles: ApplicantProfileReader,
    private readonly aiFor: AiClientForUser,
  ) {}

  async execute(user: { id: string; fullName: string | null }, request: CvReviewRequest): Promise<CvReviewResponse> {
    const [profile, ai] = await Promise.all([this.profiles.forUser(user), this.aiFor(user.id, request.provider)]);
    const targetRole = request.targetRole.trim() || profile.targetTitles[0]?.trim() || "";
    const prompt = buildReviewPrompt(request.cv, targetRole);

    const call = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      // Smaller for a long CV, so the request fits a free tier's minute (`replyCeiling`).
      maxTokens: replyCeiling(prompt, { max: MAX_TOKENS, min: RETRY_MAX_TOKENS }),
      reasoning: "medium" as const,
      // Judging, not writing: steadier scores from one run to the next. Ignored by models that fix their own.
      temperature: 0.3,
    };
    let reply = await completeWithRetry(ai, call, "cv-review");
    if (reply.finishReason === "length") {
      console.warn(`[cv-review] review hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...call, maxTokens: RETRY_MAX_TOKENS, reasoning: "low" }, "cv-review");
    }
    if (reply.finishReason === "length") {
      throw new ServiceUnavailableError(`${reply.provider} cut the review off at the token limit`);
    }

    const review = readReviewReply(reply.text, request.cv.text);
    if (!review) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable review`);

    const score = review.categories.reduce((sum, c) => sum + c.score, 0);
    return { ...review, provider: reply.provider, model: reply.model, score, rating: cvRatingFor(score), targetRole };
  }
}
