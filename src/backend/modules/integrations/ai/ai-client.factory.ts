import "server-only";

import { InternalServerError } from "@/backend/shared/exceptions";
import { isAiProviderId } from "@/shared/ai";
import type { AiClient, AiClientConfig, AiClientOptions, AiProviderId } from "./domain/ai-client";

import type { BaseAiClient } from "./infrastructure/base-ai-client";
import { resolveModel, resolveTimeoutMs } from "./config";

type AiClientClass = new (config: AiClientConfig) => BaseAiClient;

/**
 * The registry: one loader per provider, each importing only that provider's
 * integration, so a Groq user's request never loads Claude's code.
 *
 * Typed `Record<AiProviderId, …>`: adding an id to `AI_PROVIDER_IDS`
 * (`@/shared/ai`) without a line here is a build error, and so is a line for
 * an id that isn't there. This map is the only place that knows which class
 * serves which provider.
 */
const PROVIDERS: Record<AiProviderId, () => Promise<AiClientClass>> = {
  groq: () => import("./infrastructure/providers/groq.client").then((m) => m.GroqClient),
  openai: () => import("./infrastructure/providers/openai.client").then((m) => m.OpenAiClient),
  anthropic: () => import("./infrastructure/providers/anthropic.client").then((m) => m.AnthropicClient),
  gemini: () => import("./infrastructure/providers/gemini.client").then((m) => m.GeminiClient),
};

/**
 * The AI client factory: given the provider the user picked and their key,
 * returns a client for it, behind the one `AiClient` interface.
 *
 *   const ai = await createAiClient({ provider: "groq", apiKey, rateLimitKey: user.id });
 *   const { text } = await ai.complete({ system, messages: [{ role: "user", content: cv }] });
 *
 * Callers branch on nothing: which provider answers is decided here, once.
 * Guide: `docs/backend/AI_PROVIDERS.md`.
 */
export async function createAiClient(options: AiClientOptions): Promise<AiClient> {
  const { provider } = options;

  // The type already says so; this holds for a value read from the database or a cast.
  if (!isAiProviderId(provider)) throw new InternalServerError(`Not an AI provider: ${String(provider)}`);

  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new InternalServerError(`No API key given for ${provider}`);

  const Client = await PROVIDERS[provider]();
  return new Client({
    apiKey,
    model: resolveModel(provider, options.model),
    rateLimitKey: options.rateLimitKey,
    timeoutMs: resolveTimeoutMs(),
  });
}
