import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { scanJobPosting } from "@/shared/ai-tools";
import { fitRatingFor, type CvFitRequest, type CvFitResponse } from "@/shared/contracts/cv-tailor";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import { buildFitPrompt, readFitReply } from "../domain/cv-tailor-prompt";

/** The analysis's ceiling: requirements and scores as JSON plus thinking; smaller for long inputs (`replyCeiling`). */
const MAX_TOKENS = 3500;
const RETRY_MAX_TOKENS = 2500;

/**
 * `POST /api/v1/ai-tools/cv-tailor/analyze`: how the user's CV fits one job,
 * by their own AI, following the CV tailoring skill: the posting's
 * requirements, prioritised and classified, each matched against the CV with
 * its evidence, and a match score on the skill's rubric.
 *
 *   1. the posting is scanned (`scanJobPosting`): invisible text stripped,
 *      words planted for AI tools collected and forbidden, findings returned;
 *   2. one call at medium reasoning; a reply that thinks through its whole
 *      ceiling is retried once at low;
 *   3. the reply is checked (`readFitReply`): scores clamped and summed,
 *      evidence quotes looked up in the CV.
 *
 * Throws what `clientForUser` and `AiClient.complete` throw, plus a 503 when
 * the reply has no usable analysis.
 */
export class AnalyzeCvFitUseCase {
  constructor(private readonly aiFor: AiClientForUser) {}

  async execute(user: { id: string }, request: CvFitRequest): Promise<CvFitResponse> {
    const ai = await this.aiFor(user.id, request.provider);
    const scan = scanJobPosting(request.job.description);
    const prompt = buildFitPrompt(request.cv, request.job, scan);

    const call = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      maxTokens: replyCeiling(prompt, { max: MAX_TOKENS, min: RETRY_MAX_TOKENS }),
      reasoning: "medium" as const,
      // Judging, not writing: steadier scores from one run to the next.
      temperature: 0.3,
    };
    let reply = await completeWithRetry(ai, call, "cv-tailor");
    if (reply.finishReason === "length") {
      console.warn(`[cv-tailor] analysis hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...call, maxTokens: RETRY_MAX_TOKENS, reasoning: "low" }, "cv-tailor");
    }
    if (reply.finishReason === "length") throw new ServiceUnavailableError(`${reply.provider} cut the analysis off at the token limit`);

    const fit = readFitReply(reply.text, request.cv.text);
    if (!fit) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable analysis`);

    const score = fit.categories.reduce((sum, c) => sum + c.score, 0);
    return { ...fit, provider: reply.provider, model: reply.model, score, rating: fitRatingFor(score), postingFindings: scan.findings };
  }
}
