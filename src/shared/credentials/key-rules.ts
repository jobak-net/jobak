/**
 * What each provider's keys look like — checked by the browser and the server.
 *
 * One module rather than two copies: the browser checks the format before
 * spending a round trip, and the server checks it again
 * (`PUT /api/v1/ai-settings/key`), because a browser check is a convenience,
 * never a control. If the two drifted apart, a key the form accepted could be
 * refused by the API for a reason the user can't see.
 */
import type { AiProviderId } from "@/shared/ai";

/**
 * Every credential Jobak collects: the AI providers, plus Apify, which runs
 * the actors that collect the listings (required, not chosen, and not an AI).
 */
export type CredentialProvider = AiProviderId | "apify";

export interface KeyRule {
  /** Prefix the provider issues. */
  pattern: RegExp;
  /** Shortest plausible real key, used to catch a half-pasted value. */
  minLength: number;
  /** Shown when the format is wrong. Describes the shape, never echoes the key. */
  hint: string;
}

export const keyRules: Record<CredentialProvider, KeyRule> = {
  anthropic: { pattern: /^sk-ant-/, minLength: 20, hint: "Claude keys start with sk-ant-" },
  openai: { pattern: /^sk-/, minLength: 20, hint: "OpenAI keys start with sk-" },
  gemini: { pattern: /^AIza/, minLength: 30, hint: "Gemini keys start with AIza" },
  groq: { pattern: /^gsk_/, minLength: 20, hint: "Groq keys start with gsk_" },
  apify: { pattern: /^apify_api_/, minLength: 20, hint: "Apify tokens start with apify_api_" },
};

/** Longer than any real key: a ceiling against junk, not a rule about keys. */
export const KEY_MAX_LENGTH = 500;

export type FormatCheck = { ok: true } | { ok: false; reason: string };

/**
 * Cheap local check: is this even shaped like a key for this provider?
 *
 * Catches the common mistakes — pasting the wrong provider's key, pasting a
 * truncated value, or pasting whitespace — without a network call.
 */
export function checkKeyFormat(provider: CredentialProvider, key: string): FormatCheck {
  const trimmed = key.trim();
  const rule = keyRules[provider];

  if (!trimmed) return { ok: false, reason: "Enter a key first." };
  if (/\s/.test(trimmed)) return { ok: false, reason: "That key contains spaces — check the paste." };
  if (!rule.pattern.test(trimmed)) return { ok: false, reason: rule.hint };
  if (trimmed.length < rule.minLength) return { ok: false, reason: "That key looks truncated." };
  if (trimmed.length > KEY_MAX_LENGTH) return { ok: false, reason: "That's longer than any key — check the paste." };

  return { ok: true };
}
