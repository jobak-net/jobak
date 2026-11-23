import "server-only";

import { InternalServerError } from "@/backend/shared/exceptions";
import { enforceRateLimit } from "@/backend/shared/rate-limit";
import { findAiModel } from "@/shared/ai";

import { AI_DEFAULTS } from "../config";
import type {
  AiClient,
  AiClientConfig,
  AiCompletion,
  AiCompletionRequest,
  AiProviderId,
} from "../domain/ai-client";

/** Added to the system prompt in JSON mode. OpenAI also refuses JSON mode unless the prompt says "JSON". */
const JSON_INSTRUCTION = "Reply with one JSON object and nothing else: no prose, no code fences.";

/** A request after the shared steps: defaults filled in, JSON instruction added. */
export interface PreparedRequest extends Omit<AiCompletionRequest, "maxTokens"> {
  maxTokens: number;
}

/**
 * What every provider's integration extends.
 *
 * `complete()` runs the steps every provider shares, in order, and leaves only
 * the provider's wire format to the subclass (`send`):
 *
 *   1. check the request (at least one message);
 *   2. count the call against our rate limit for this provider and user;
 *   3. fill in the defaults and the JSON instruction; drop `temperature` for
 *      a model that only takes its own (`fixedTemperature` in `AI_MODELS`),
 *      and `reasoning` for a model that doesn't take it (`reasoningEffort`);
 *   4. `send` — the subclass translates to its API and back.
 *
 * Built only by the factory (`../ai-client.factory.ts`); nothing else constructs one.
 */
export abstract class BaseAiClient implements AiClient {
  abstract readonly provider: AiProviderId;

  constructor(protected readonly config: AiClientConfig) {}

  get model(): string {
    return this.config.model;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    if (request.messages.length === 0) throw new InternalServerError("An AI request needs at least one message");

    await enforceRateLimit(this.provider, this.config.rateLimitKey);

    const json = request.responseFormat === "json";
    const model = findAiModel(this.provider, this.model);
    return this.send({
      ...request,
      system: json ? [request.system, JSON_INSTRUCTION].filter(Boolean).join("\n\n") : request.system,
      maxTokens: request.maxTokens ?? AI_DEFAULTS.maxTokens,
      temperature: model?.fixedTemperature ? undefined : request.temperature,
      reasoning: model?.reasoningEffort ? request.reasoning : undefined,
    });
  }

  /** Counted against the same limit as `complete`, then the provider's free check (`probe`). */
  async verifyKey(): Promise<void> {
    await enforceRateLimit(this.provider, this.config.rateLimitKey);
    await this.probe(Math.min(this.config.timeoutMs, AI_DEFAULTS.verifyTimeoutMs));
  }

  /** One call to the provider: translate the request, post it (`callProvider`), translate the answer. */
  protected abstract send(request: PreparedRequest): Promise<AiCompletion>;

  /** An authenticated read that costs nothing (the model list). Throws via `callProvider` when the key is refused. */
  protected abstract probe(timeoutMs: number): Promise<void>;
}
