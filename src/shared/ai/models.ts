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
   * The model accepts only its own temperature (OpenAI's reasoning models):
   * the client leaves `temperature` out rather than have the call refused.
   */
  fixedTemperature?: boolean;
}

export const AI_MODELS = {
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", note: "Strong all-rounder. Works on the free tier." },
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", note: "OpenAI's open model, served by Groq. More careful on long CVs." },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", note: "Fastest and lightest. Fine for short tasks." },
  ],
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast and capable. Works on the free tier." },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Google's strongest. Slower, with tighter free limits." },
    { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Cheapest and quickest." },
  ],
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini", note: "Good quality at a low price." },
    { id: "gpt-4.1", label: "GPT-4.1", note: "Stronger writing, at a higher price." },
    { id: "gpt-5-mini", label: "GPT-5 mini", note: "Reasons before it answers. Slower, often sharper.", fixedTemperature: true },
  ],
  anthropic: [
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "The best balance of quality and speed." },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Anthropic's most capable. Slower, and costs more." },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and cheapest Claude." },
  ],
} as const satisfies Record<AiProviderId, readonly AiModelOption[]>;

/** A model id on `provider`'s list. */
export type AiModelId<P extends AiProviderId = AiProviderId> = (typeof AI_MODELS)[P][number]["id"];

/**
 * Each provider's default: what runs until the user picks something else.
 * Typed so each default must be on its provider's list.
 */
export const AI_DEFAULT_MODELS: { readonly [P in AiProviderId]: AiModelId<P> } = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-5-5",
};

/** The list entry for `model` under `provider`, or undefined when it isn't on the list. */
export function findAiModel(provider: AiProviderId, model: string): AiModelOption | undefined {
  return (AI_MODELS[provider] as readonly AiModelOption[]).find((option) => option.id === model);
}

export function isAiModelFor(provider: AiProviderId, model: string): boolean {
  return findAiModel(provider, model) !== undefined;
}
