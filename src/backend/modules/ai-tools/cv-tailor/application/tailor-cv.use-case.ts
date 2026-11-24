import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { plantedWordsIn, restoreContactDetails, scanJobPosting, unsupportedNumbers } from "@/shared/ai-tools";
import type { CvTailorRequest, CvTailorResponse } from "@/shared/contracts/cv-tailor";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import { keywordsNotIn } from "../../shared/domain/claims";
import { buildTailorPrompt, readTailorReply } from "../domain/cv-tailor-prompt";

/** The tailored CV's ceiling: a two-page CV plus changes, gaps, scores and thinking. */
const MAX_TOKENS = 4000;
const RETRY_MAX_TOKENS = 3000;

/**
 * `POST /api/v1/ai-tools/cv-tailor`: the CV tailored to the job, after the
 * analysis, when the user asks. The page sends the analysis back as `focus`
 * and `originalScores` (the server keeps nothing between the two requests).
 *
 * After the reply (`readTailorReply`), what the model might have got wrong is
 * put right or flagged, not trusted:
 *  - the original's contact details are put back (`restoreContactDetails`);
 *  - numbers the original doesn't state, keywords it never mentions, and
 *    words the posting planted for AI tools are listed for the user.
 *
 * Throws as `AnalyzeCvFitUseCase` does, with a 503 when the reply has no usable CV.
 */
export class TailorCvUseCase {
  constructor(private readonly aiFor: AiClientForUser) {}

  async execute(user: { id: string }, request: CvTailorRequest): Promise<CvTailorResponse> {
    const ai = await this.aiFor(user.id, request.provider);
    const scan = scanJobPosting(request.job.description);
    const prompt = buildTailorPrompt(request.cv, request.job, scan, request.focus, request.originalScores);

    const call = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      maxTokens: replyCeiling(prompt, { max: MAX_TOKENS, min: RETRY_MAX_TOKENS }),
      reasoning: "medium" as const,
      // Low: higher temperatures embellished bullets with details the CV never gave.
      temperature: 0.4,
    };
    let reply = await completeWithRetry(ai, call, "cv-tailor");
    if (reply.finishReason === "length") {
      console.warn(`[cv-tailor] tailoring hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...call, maxTokens: RETRY_MAX_TOKENS, reasoning: "low" }, "cv-tailor");
    }
    if (reply.finishReason === "length") throw new ServiceUnavailableError(`${reply.provider} cut the tailored CV off at the token limit`);

    const tailored = readTailorReply(reply.text);
    if (!tailored) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable CV`);

    const contacts = restoreContactDetails(tailored.cv, request.cv.text);
    // Kinds only ("email", "link"): the details themselves never go in a log.
    if (contacts.restored.length > 0) console.warn(`[cv-tailor] contact details put back: ${contacts.restored.join(", ")}`);

    return {
      provider: reply.provider,
      model: reply.model,
      cv: contacts.text,
      changes: tailored.changes,
      keywords: tailored.keywords,
      gaps: tailored.gaps,
      recommendations: tailored.recommendations,
      categories: tailored.categories,
      score: tailored.categories.reduce((sum, c) => sum + c.score, 0),
      unsupportedNumbers: unsupportedNumbers(contacts.text, request.cv.text),
      unsupportedKeywords: keywordsNotIn(tailored.keywords, request.cv.text),
      plantedWordsInCv: plantedWordsIn(contacts.text, scan.plantedWords),
    };
  }
}
