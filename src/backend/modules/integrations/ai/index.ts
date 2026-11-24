/**
 * The AI integration: one client for whichever provider the user picked.
 * Guide: `docs/backend/AI_PROVIDERS.md`.
 *
 *   ai-client.factory.ts           createAiClient(): provider id → that provider's client
 *   config.ts                      default models, AI_MODEL_<PROVIDER> / AI_TIMEOUT_MS overrides
 *   domain/ai-client.ts            AiClient, the port callers use, and its shapes
 *   infrastructure/
 *     base-ai-client.ts            the steps every provider shares (rate limit, defaults, JSON mode)
 *     http.ts                      one POST to a provider; its failures → our exceptions
 *     providers/                   one integration per provider
 */
export { createAiClient } from "./ai-client.factory";
export { AI_DEFAULT_MODELS } from "./config";
export type {
  AiClient,
  AiClientOptions,
  AiCompletion,
  AiCompletionRequest,
  AiFinishReason,
  AiMessage,
  AiProviderId,
} from "./domain/ai-client";
