import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { restoreContactDetails, unsupportedNumbers } from "@/shared/ai-tools";
import type { CvImproveRequest, CvImproveResponse } from "@/shared/contracts/cv-review";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import type { ApplicantProfileReader } from "../../shared/domain/applicant-profile";
import { buildImprovePrompt, readImproveReply } from "../domain/cv-review-prompt";

/**
 * The ceiling: a two-page CV is up to about 2,000 tokens, plus changes,
 * scores and a reasoning model's thinking. See `review-cv.use-case.ts` on
 * why it isn't higher.
 */
const MAX_TOKENS = 4000;
const RETRY_MAX_TOKENS = 3000;

/**
 * `POST /api/v1/ai-tools/cv-review/improve`: the improved CV, after the
 * review, when the user asks for it (the CV review skill never rewrites
 * before reviewing). The page sends the review's findings back as `focus`:
 * nothing is kept on the server between the two requests.
 *
 * The reply is plain text in marked sections (`readImproveReply`). The
 * original's contact details are then put back wherever the model changed
 * them (`restoreContactDetails`), and the CV is checked for numbers the
 * original doesn't have (`unsupportedNumbers`): the model is told never to
 * invent a metric, and the user is warned if it did.
 *
 * Throws as `ReviewCvUseCase` does, with a 503 when the reply has no usable CV.
 */
export class ImproveCvUseCase {
  constructor(
    private readonly profiles: ApplicantProfileReader,
    private readonly aiFor: AiClientForUser,
  ) {}

  async execute(user: { id: string; fullName: string | null }, request: CvImproveRequest): Promise<CvImproveResponse> {
    const [profile, ai] = await Promise.all([this.profiles.forUser(user), this.aiFor(user.id, request.provider)]);
    const targetRole = request.targetRole.trim() || profile.targetTitles[0]?.trim() || "";
    const prompt = buildImprovePrompt(request.cv, targetRole, request.focus, request.originalScores);

    const call = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      // Smaller for a long CV, so the request fits a free tier's minute (`replyCeiling`).
      maxTokens: replyCeiling(prompt, { max: MAX_TOKENS, min: RETRY_MAX_TOKENS }),
      reasoning: "medium" as const,
      // Low: at 0.6 it embellished bullets with details the CV never gave. Ignored by models that fix their own.
      temperature: 0.4,
    };
    let reply = await completeWithRetry(ai, call, "cv-review");
    if (reply.finishReason === "length") {
      console.warn(`[cv-review] improvement hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...call, maxTokens: RETRY_MAX_TOKENS, reasoning: "low" }, "cv-review");
    }
    if (reply.finishReason === "length") {
      throw new ServiceUnavailableError(`${reply.provider} cut the improved CV off at the token limit`);
    }

    const improved = readImproveReply(reply.text);
    if (!improved) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable CV`);
    // Contact details are facts: whatever the model did to them, the original's go back (`restoreContactDetails`).
    const contacts = restoreContactDetails(improved.cv, request.cv.text);
    // Kinds only ("email", "link"): the details themselves never go in a log.
    if (contacts.restored.length > 0) console.warn(`[cv-review] contact details put back: ${contacts.restored.join(", ")}`);

    return {
      provider: reply.provider,
      model: reply.model,
      cv: contacts.text,
      changes: improved.changes,
      stillNeeded: improved.stillNeeded,
      categories: improved.categories,
      score: improved.categories.reduce((sum, c) => sum + c.score, 0),
      unsupportedNumbers: unsupportedNumbers(contacts.text, request.cv.text),
    };
  }
}
