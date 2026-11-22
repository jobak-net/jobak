import { AI_DEFAULT_MODELS, isAiModelFor } from "@/shared/ai";

import type { AiProviderId } from "./domain/ai-client";

/**
 * Which model a call runs on, and the call settings every provider shares.
 *
 * The models a user may pick, and each provider's default, are the shared list
 * (`AI_MODELS` / `AI_DEFAULT_MODELS` in `@/shared/ai`), since Settings shows it
 * too. This file decides between the user's pick and the defaults.
 */
export { AI_DEFAULT_MODELS };

export const AI_DEFAULTS = {
  /** Long enough for a full CV review or cover letter. */
  maxTokens: 4096,
  /** A slow model on a long prompt can take a while; past this the user is better off retrying. */
  timeoutMs: 90_000,
  /** A key check is one small read: past this, the provider is down rather than slow. */
  verifyTimeoutMs: 15_000,
} as const;

/** `groq` → `AI_MODEL_GROQ`. */
export function modelEnvVarFor(provider: AiProviderId): string {
  return `AI_MODEL_${provider.toUpperCase()}`;
}

/**
 * The model a call runs on, the first of:
 *
 *  1. `requested` — the user's pick (or a use case's) — **if it is on the
 *     provider's list**. A stored pick taken off the list since (a retired
 *     model) is logged and skipped, so the user's tools keep working;
 *  2. `AI_MODEL_<PROVIDER>` — this environment's default, for operators. Not
 *     checked against the list: it is the way to move everyone off a model
 *     the day a provider retires it, before the list is updated;
 *  3. the shared default (`AI_DEFAULT_MODELS`).
 */
export function resolveModel(
  provider: AiProviderId,
  requested?: string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  const pick = requested?.trim();
  if (pick) {
    if (isAiModelFor(provider, pick)) return pick;
    console.warn(`[ai] ${provider} model "${pick}" is not on the list; using the default`);
  }
  return env[modelEnvVarFor(provider)]?.trim() || AI_DEFAULT_MODELS[provider];
}

/** The timeout in force. A value that isn't a positive number is ignored. */
export function resolveTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.AI_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : AI_DEFAULTS.timeoutMs;
}
