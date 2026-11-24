import type { AiClient } from "@/backend/modules/integrations";
import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { findAiTells, plantedWordsIn, scanJobPosting, structuralTells, unsupportedDurations } from "@/shared/ai-tools";
import type { CoverLetterRequest, CoverLetterResponse } from "@/shared/contracts/cover-letter";

import { completeWithRetry, type AiClientForUser } from "../../shared/application/complete-with-retry";
import { replyCeiling } from "../../shared/application/token-budget";
import type { ApplicantProfileReader } from "../../shared/domain/applicant-profile";
import { buildCoverLetterPrompt, matchSkills, readCoverLetterReply } from "../domain/cover-letter-prompt";
import { applyRevisions, buildRevisionPrompt, reviewSentences } from "../domain/cover-letter-revision";

/**
 * The draft's ceiling. At medium reasoning GPT-OSS used 735-1,139 tokens on
 * some runs and more than 2,000 on another (all of it thinking, no letter).
 * Not much higher than this: Groq's free tier allows 8,000 tokens a minute
 * there, and the ceiling appears to be counted up front, so a high one leaves
 * no room for the revision (at 4,096 it was throttled every time).
 */
const DRAFT_MAX_TOKENS = 3000;
/** When the draft thinks through its whole ceiling, one retry at low reasoning with this one. */
const DRAFT_RETRY_MAX_TOKENS = 1500;
/** The revision: every sentence back, about 400-600 tokens, plus thinking at low effort. A reply cut off keeps the draft. */
const REVISION_MAX_TOKENS = 1400;
/**
 * How long a reasoning model thinks before the draft. Medium, not low: at
 * low, GPT-OSS ignored most style rules, invented projects and wrote broken
 * phrases; at medium it kept to the facts and stated gaps plainly. Ignored by
 * models without the setting.
 */
const DRAFT_REASONING = "medium" as const;
/**
 * The revision is small and well specified, so low effort. At medium, a
 * whole-letter edit thought through its 1,600 tokens and returned nothing.
 */
const REVISION_REASONING = "low" as const;

/**
 * `POST /api/v1/ai-tools/cover-letter`: a cover letter for one job, written by
 * the user's own AI from their Jobak profile.
 *
 *   1. read the profile on the server (name, skills, target roles, seniority,
 *      location) — the browser sends the name, the job, the tone, and
 *      optionally what the applicant has done in their own words. The
 *      applicant presents as their first target role (Preferences), else as
 *      the job's own title;
 *   2. scan the posting (`scanJobPosting`): strip invisible text, collect the
 *      words it plants for AI tools;
 *   3. build the prompt — the posting as untrusted data, the planted words as
 *      forbidden, the style rules for a formal letter that reads as written by
 *      a person — and run it on the provider the user picked (`clientForUser`);
 *   4. read the letter and reword it sentence by sentence: every sentence
 *      goes back to the model, the ones the checks flag (stock phrasing, a
 *      duration the applicant never stated, far too long) with what to fix,
 *      and each replacement is kept or dropped on its own
 *      (`cover-letter-revision.ts`). A failed pass keeps the draft. What's
 *      left is returned as `styleFlags` for the user to reword;
 *   5. check the final letter for planted words anyway.
 *
 * Throws what `clientForUser` and `AiClient.complete` throw (`ai-not-connected`,
 * `ai-key-rejected`, `ai-model-unavailable`, `ai-provider-limited`,
 * `rate-limited`, 503), plus a 503 when the first reply isn't a usable letter.
 */
export class WriteCoverLetterUseCase {
  constructor(
    private readonly profiles: ApplicantProfileReader,
    private readonly aiFor: AiClientForUser,
  ) {}

  async execute(
    user: { id: string; fullName: string | null },
    request: CoverLetterRequest,
  ): Promise<CoverLetterResponse> {
    const [profile, ai] = await Promise.all([
      this.profiles.forUser(user),
      this.aiFor(user.id, request.provider),
    ]);

    const scan = scanJobPosting(request.job.description);
    const matchedSkills = matchSkills(profile.skills, scan.cleaned);
    const applicant = {
      name: request.applicant.name.trim() || profile.fullName || "",
      role: profile.targetTitles[0]?.trim() || request.job.title.trim(),
      experience: request.applicant.experience?.trim() || undefined,
    };
    const fill = { name: applicant.name, company: request.job.company, role: request.job.title };

    const prompt = buildCoverLetterPrompt({
      profile,
      applicant,
      job: request.job,
      scan,
      tone: request.tone,
      matchedSkills,
    });

    const draftRequest = {
      system: prompt.system,
      // Plain text, not JSON mode: see `REPLY` in cover-letter-prompt.ts.
      messages: [{ role: "user" as const, content: prompt.user }],
      // Smaller when a whole CV makes the prompt long, so the request fits a free tier's minute (`replyCeiling`).
      maxTokens: replyCeiling(prompt, { max: DRAFT_MAX_TOKENS, min: DRAFT_RETRY_MAX_TOKENS }),
      reasoning: DRAFT_REASONING,
      // A little more variety in wording than the default; ignored by models that fix their own.
      temperature: 0.8,
    };
    let reply = await completeWithRetry(ai, draftRequest, "cover-letter");
    if (reply.finishReason === "length") {
      // A reasoning model can think through the whole ceiling and write nothing. Once more, thinking less.
      console.warn(`[cover-letter] draft hit the token limit (${reply.usage?.outputTokens ?? "?"} tokens); retrying at low reasoning`);
      reply = await completeWithRetry(ai, { ...draftRequest, maxTokens: DRAFT_RETRY_MAX_TOKENS, reasoning: "low" }, "cover-letter");
    }
    if (reply.finishReason === "length") {
      throw new ServiceUnavailableError(`${reply.provider} cut the letter off at the token limit`);
    }
    const draft = readCoverLetterReply(reply.text, fill);
    if (!draft) throw new ServiceUnavailableError(`${reply.provider} didn't return a usable letter`);

    // What the reword pass may keep claims from: the applicant's own words, title and skills.
    const facts = [
      applicant.experience,
      `Title: ${applicant.role}`,
      profile.skills.length > 0 && `Skills: ${profile.skills.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
    const letter = await this.revise(ai, draft, scan.plantedWords, applicant.experience ?? "", facts);

    return {
      letter,
      provider: reply.provider,
      model: reply.model,
      matchedSkills,
      postingFindings: scan.findings,
      plantedWordsInLetter: plantedWordsIn(letter, scan.plantedWords),
      styleFlags: [
        ...findAiTells(letter),
        ...structuralTells(letter),
        ...unsupportedDurations(letter, applicant.experience ?? "").map((d) => `“${d}”: not something you said`),
      ],
    };
  }

  /**
   * The second pass: every sentence reworded, the flagged ones fixed, each
   * replacement judged alone (`applyRevisions`). Best effort: a failure (an outage, an unusable
   * reply) keeps the draft, since the user already has a letter and shouldn't
   * lose it to a polish step. When the provider throttles it (a free tier's
   * per-minute tokens), it's retried once after the wait the provider names,
   * if that's short.
   */
  private async revise(
    ai: AiClient,
    draft: string,
    plantedWords: string[],
    /** The applicant's own words: a duration not in them is made up. */
    ownWords: string,
    /** Own words, title and skills: what a claim must come from. */
    facts: string,
  ): Promise<string> {
    const flagged = reviewSentences(draft, ownWords);
    if (flagged.length === 0) return draft;

    const prompt = buildRevisionPrompt(draft, flagged, plantedWords, facts);
    const request = {
      system: prompt.system,
      messages: [{ role: "user" as const, content: prompt.user }],
      maxTokens: REVISION_MAX_TOKENS,
      reasoning: REVISION_REASONING,
      // Less expected wording is the point of this pass; ignored by models that fix their own.
      temperature: 0.9,
    };

    try {
      const reply = await completeWithRetry(ai, request, "cover-letter");
      if (reply.finishReason === "length") {
        console.warn("[cover-letter] revision cut off at the token limit; keeping the draft");
        return draft;
      }
      const result = applyRevisions(draft, flagged, reply.text, plantedWords, ownWords);
      if (result.dropped.length > 0) {
        console.warn(`[cover-letter] revision: kept ${result.kept} of ${flagged.length}; dropped ${result.dropped.join("; ")}`);
      }
      return result.letter;
    } catch (error) {
      console.warn(`[cover-letter] revision skipped: ${(error as Error).message}`);
      return draft;
    }
  }
}
