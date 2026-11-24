/**
 * The models a user can pick for each AI provider — the one list, shared by
 * both sides.
 *
 *  - Settings shows it, under the provider the user connected.
 *  - The backend accepts only a model on it: the `PUT /api/v1/ai-settings`
 *    schema refuses anything else, and the AI client factory falls back to the
 *    default when a stored choice has since been taken off the list.
 *
 * Curated, not fetched from each provider: their own lists change without
 * notice and mix in models the tools can't use (speech, embeddings, previews).
 * When a provider retires a model, take it off here; users who had picked it
 * move to the default on their next call, without an error.
 *
 * Checked against each provider's models and deprecations pages on
 * 2026-11-22 (see docs/backend/AI_PROVIDERS.md, "Models: the user's pick").
 * Retired since the first list: Groq's Llama 3.x (shut down 2026-08-16),
 * Gemini 2.5 (Flash/Pro shut down 2026-12-01, closed to new users), OpenAI
 * GPT-4.1 and GPT-5 mini (shutting down 2027-01-14 / 2026-12-11).
 */
import type { AiProviderId } from "./providers";

export interface AiModelOption {
  /** The provider's own model id, sent as-is. */
  id: string;
  /** What Settings calls it. */
  label: string;
  /** One line on when to pick it. */
  note: string;
  /**
   * The client never sends `temperature` to this model, because the provider
   * refuses it (a 400): Claude 4.7 and later, on every API version; and
   * OpenAI's GPT-6 family, whose docs don't say it's accepted — leaving it
   * out is always accepted, so it's left out.
   */
  fixedTemperature?: boolean;
  /**
   * A reasoning model that takes `reasoning_effort` (low, medium, high), so a
   * request's `reasoning` is sent. Groq documents it for GPT-OSS only. Left
   * off, `reasoning` is never sent: other models refuse unknown parameters.
   */
  reasoningEffort?: boolean;
}

export const AI_MODELS = {
  groq: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", note: "OpenAI's open model, served fast by Groq. The best quality on Groq.", reasoningEffort: true },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", note: "Smaller and quicker. Fine for short tasks.", reasoningEffort: true },
    { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B", note: "Alibaba's Qwen, a preview model on Groq: may change or be retired sooner." },
  ],
  gemini: [
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Google's latest Flash: fast and capable." },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "The previous Flash. A fallback if 3.8 is busy." },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "Cheapest and quickest." },
  ],
  openai: [
    { id: "gpt-6-luna", label: "GPT-6 Luna", note: "Fast and affordable. Good for most letters and reviews.", fixedTemperature: true },
    { id: "gpt-6.1-terra", label: "GPT-6.1 Terra", note: "Balanced: sharper writing at a moderate price.", fixedTemperature: true },
    { id: "gpt-6.2-sol", label: "GPT-6.2 Sol", note: "OpenAI's flagship. The best quality, and the highest price.", fixedTemperature: true },
  ],
  anthropic: [
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "The best balance of quality and speed.", fixedTemperature: true },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Anthropic's most capable. Slower, and costs more.", fixedTemperature: true },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and cheapest Claude.", fixedTemperature: true },
  ],
} as const satisfies Record<AiProviderId, readonly AiModelOption[]>;

/** A model id on `provider`'s list. */
export type AiModelId<P extends AiProviderId = AiProviderId> = (typeof AI_MODELS)[P][number]["id"];

/**
 * Each provider's default: what runs until the user picks something else.
 * Typed so each default must be on its provider's list.
 */
export const AI_DEFAULT_MODELS: { readonly [P in AiProviderId]: AiModelId<P> } = {
  groq: "openai/gpt-oss-120b",
  gemini: "gemini-3.8-flash",
  openai: "gpt-6-luna",
  anthropic: "claude-sonnet-5-5",
};

/** The list entry for `model` under `provider`, or undefined when it isn't on the list. */
export function findAiModel(provider: AiProviderId, model: string): AiModelOption | undefined {
  return (AI_MODELS[provider] as readonly AiModelOption[]).find((option) => option.id === model);
}

export function isAiModelFor(provider: AiProviderId, model: string): boolean {
  return findAiModel(provider, model) !== undefined;
}
