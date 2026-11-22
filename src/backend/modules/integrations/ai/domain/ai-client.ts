/**
 * The AI client and its shapes: the port every provider integration implements
 * and every caller uses (`@/backend/modules/integrations`).
 *
 * Provider-neutral on purpose: a use case written against `AiClient` runs the
 * same on Groq, OpenAI, Claude or Gemini, and never learns which one it got.
 */
import type { AiProviderId } from "@/shared/ai";

export type { AiProviderId };

/** One turn of the conversation. The system prompt is separate (`AiCompletionRequest.system`). */
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiCompletionRequest {
  /** How the model should behave: the tool's instructions. */
  system?: string;
  /** The conversation so far, oldest first; at least one, usually a single user turn. */
  messages: AiMessage[];
  /**
   * `json`: the reply must be one JSON object (a scored report, a list of
   * questions). The provider's JSON mode is used where it has one; the
   * caller still validates the shape (Zod) — no provider guarantees it.
   * Default `text`.
   */
  responseFormat?: "text" | "json";
  /** Ceiling on the reply's length. Default `AI_DEFAULTS.maxTokens` (config.ts). */
  maxTokens?: number;
  /** 0–1. Left to the provider's default when unset. */
  temperature?: number;
  /** Cancels the call, e.g. when the browser goes away. A timeout applies regardless. */
  signal?: AbortSignal;
}

/** Why the model stopped: finished, hit `maxTokens`, or anything else (a filter, a refusal). */
export type AiFinishReason = "stop" | "length" | "other";

export interface AiCompletion {
  /** The reply, as text — parse it when `responseFormat` was `json`. */
  text: string;
  finishReason: AiFinishReason;
  /** Who answered, for logs and usage tracking. Never something to branch on. */
  provider: AiProviderId;
  model: string;
  /** Token counts, when the provider reports them. */
  usage: { inputTokens: number; outputTokens: number } | null;
}

/** What the factory hands back: one interface for every provider. */
export interface AiClient {
  readonly provider: AiProviderId;
  readonly model: string;
  /**
   * Sends one request and waits for the whole reply.
   *
   * Throws (all from `@/backend/shared/exceptions`):
   *  - `TooManyRequestsError` (429) — over our own limit for this provider;
   *  - `AiProviderLimitedError` (429) — the provider is throttling the key;
   *  - `AiKeyRejectedError` (422) — the provider refused the key;
   *  - `ServiceUnavailableError` (503) — the provider failed, timed out or is unreachable;
   *  - `InternalServerError` (500) — the provider refused the request itself (our bug).
   */
  complete(request: AiCompletionRequest): Promise<AiCompletion>;

  /**
   * Proves the key works, at no cost to the user: an authenticated read of
   * the provider's model list — no tokens, nothing billed. Resolves when the
   * provider accepts the key; throws as `complete` does, `AiKeyRejectedError`
   * when it refuses it.
   */
  verifyKey(): Promise<void>;
}

/** What a caller gives the factory. */
export interface AiClientOptions {
  /** Which provider the user picked. */
  provider: AiProviderId;
  /** The user's own key for it, decrypted. Never logged, never returned. */
  apiKey: string;
  /**
   * Who the call counts against in our rate limit for this provider — the
   * user's id, since each user brings their own key and quota.
   */
  rateLimitKey: string;
  /**
   * The model to run on: the user's pick (`GetAiSettingsUseCase`), or a use
   * case's own. Must be on the provider's list (`AI_MODELS`, `@/shared/ai`):
   * one that isn't is logged and replaced by the default, never an error.
   * Unset or null: the default (`resolveModel` in `config.ts`).
   */
  model?: string | null;
}

/** What each provider's integration is built with: the options, with the defaults filled in. */
export interface AiClientConfig {
  apiKey: string;
  model: string;
  rateLimitKey: string;
  timeoutMs: number;
}
