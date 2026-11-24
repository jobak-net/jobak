import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { findAiTells, plantedWordsIn, scanJobPosting } from "@/shared/ai-tools";
import type { HrEmailRequest, HrEmailResponse } from "@/shared/contracts/hr-email";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import { skillsNotIn } from "../../shared/domain/claims";
import type { ApplicantProfileReader } from "../../shared/domain/applicant-profile";
import { buildHrEmailPrompt, readHrEmailReply } from "../domain/hr-email-prompt";

/** An email is short: a few hundred tokens plus a reasoning model's thinking. */
const MAX_TOKENS = 2000;
const RETRY_MAX_TOKENS = 1500;

/**
 * `POST /api/v1/ai-tools/hr-email`: one email to HR, a recruiter or a hiring
 * manager, by the user's own AI, following the HR email skill.
 *
 *   1. the facts: the CV when the user chose one, else their profile's roles
 *      and skills (read on the server, never sent by the browser);
 *   2. text someone else wrote (the posting, HR's message) is scanned
 *      (`scanJobPosting`): invisible text stripped, planted words forbidden;
 *   3. one call at medium reasoning; a reply that thinks through its ceiling
 *      is retried once at low;
 *   4. the reply is read (`readHrEmailReply`) and checked: phrasing that reads
 *      as generated, planted words that made it in, and skills the email
 *      claims that the user's material never names (`skillsNotIn`) are listed.
 *
 * Throws what `clientForUser` and `AiClient.complete` throw, plus a 503 when
 * the reply has no usable email.
 */
export class WriteHrEmailUseCase {
  constructor(
    private readonly profiles: ApplicantProfileReader,
    private readonly aiFor: AiClientForUser,
  ) {}

  async execute(user: { id: string; fullName: string | null }, request: HrEmailRequest): Promise<HrEmailResponse> {
    const [profile, ai] = await Promise.all([this.profiles.forUser(user), this.aiFor(user.id, request.provider)]);
    const scans = { posting: scanJobPosting(request.job.posting), theirMessage: scanJobPosting(request.context.theirMessage) };
    const prompt = buildHrEmailPrompt(request, profile, scans);

    const call = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      maxTokens: replyCeiling(prompt, { max: MAX_TOKENS, min: RETRY_MAX_TOKENS }),
      reasoning: "medium" as const,
      // A little variety in wording; ignored by models that fix their own.
      temperature: 0.6,
    };
    let reply = await completeWithRetry(ai, call, "hr-email");
    if (reply.finishReason === "length") {
      console.warn(`[hr-email] hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...call, maxTokens: RETRY_MAX_TOKENS, reasoning: "low" }, "hr-email");
    }
    if (reply.finishReason === "length") throw new ServiceUnavailableError(`${reply.provider} cut the email off at the token limit`);

    const email = readHrEmailReply(reply.text);
    if (!email) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable email`);

    const planted = [...new Set([...scans.posting.plantedWords, ...scans.theirMessage.plantedWords])];
    // What the applicant's own material says: a skill outside it is a claim to check.
    const facts = [
      request.cv?.text ?? [...profile.skills, ...profile.targetTitles].join(", "),
      request.context.notes,
      request.context.draft,
    ].join("\n");
    return {
      ...email,
      provider: reply.provider,
      model: reply.model,
      styleFlags: findAiTells(`${email.subject}\n${email.body}`),
      postingFindings: [...scans.posting.findings, ...scans.theirMessage.findings],
      plantedWordsInEmail: plantedWordsIn(`${email.subject}\n${email.body}`, planted),
      unsupportedSkills: skillsNotIn(email.body, `${request.job.posting}\n${request.context.theirMessage}`, facts, [
        request.job.company,
        request.job.title,
        request.recipient.name,
        request.sender.name,
      ]),
    };
  }
}
