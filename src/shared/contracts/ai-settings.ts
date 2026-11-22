/**
 * The contract of `/api/v1/ai-settings`: how the signed-in user's AI tools
 * run — which providers they connected a key for, and the model picked per
 * provider. Imports only other shared files (see `src/shared/README.md` for
 * the rule of this folder).
 *
 * GET — read them
 *   200  AiSettingsResponse
 *   401  { error, code }     nobody is signed in
 *   503  { error, code }     couldn't read them
 *
 * PUT — pick a model for one provider (Settings, AI provider), JSON
 *   body UpdateAiModelRequest   `model: null` goes back to the default
 *   200  AiSettingsResponse     what is now stored
 *   400  { error, code }        not a provider, or a model not on its list (`AI_MODELS`)
 *   401  { error, code }        nobody is signed in
 *   404  { error, code }        no preferences yet (onboarding not finished)
 *   503  { error, code }        couldn't save
 *
 * PUT /key — connect a provider (onboarding's AI step, Settings), JSON
 *   body ConnectAiKeyRequest    `model` saved with the key, in the same write
 *   200  AiSettingsResponse     the key works, is stored encrypted, and its
 *                               provider is now `preferred`
 *   400  { error, code }        not a provider, not shaped like its keys, or a
 *                               model not on its list
 *   401  { error, code }        nobody is signed in
 *   404  { error, code }        no preferences yet (onboarding not finished)
 *   422  { error, code }        `ai-key-rejected`: the provider refused it
 *   429  { error, code }        `rate-limited` (ours) or `ai-provider-limited` (theirs)
 *   503  { error, code }        the provider or the database didn't answer
 *
 * DELETE /key/[provider] — forget a key (Settings)
 *   200  AiSettingsResponse     the next connected provider, if any, is now `preferred`;
 *                               removing a key that isn't there answers the same
 *   400  { error, code }        not a provider
 *   401  { error, code }        nobody is signed in
 *
 * PUT /preferred — which saved key the AI tools use (Settings), JSON
 *   body SetPreferredAiProviderRequest
 *   200  AiSettingsResponse
 *   400  { error, code }        not a provider
 *   401  { error, code }        nobody is signed in
 *   409  { error, code }        `ai-not-connected`: no saved key for it
 *
 * A key goes in and never comes back out: no response carries a key, or any
 * part of one — only which providers have one.
 */

import type { AiProviderId } from "@/shared/ai";

export const AI_SETTINGS_API_PATH = "/api/v1/ai-settings";
export const AI_KEY_API_PATH = "/api/v1/ai-settings/key";
export const AI_PREFERRED_API_PATH = "/api/v1/ai-settings/preferred";

/** `DELETE` here removes that provider's key. */
export const aiKeyApiPath = (provider: AiProviderId) => `${AI_KEY_API_PATH}/${encodeURIComponent(provider)}`;

export interface AiSettingsResponse {
  /** Providers with a stored key, preferred first. Empty until one is connected. */
  connected: AiProviderId[];
  /** The provider the AI tools run on: the one connected last. Null when none is. */
  preferred: AiProviderId | null;
  /**
   * The model the user picked, per provider. A provider with no entry runs
   * its default. A pick that has since been taken off the list is left out.
   */
  models: Partial<Record<AiProviderId, string>>;
  /**
   * The model each provider runs when the user hasn't picked one: this
   * server's, which can differ from `AI_DEFAULT_MODELS` (`AI_MODEL_<PROVIDER>`).
   * What Settings labels "Default".
   */
  defaults: Record<AiProviderId, string>;
}

export interface UpdateAiModelRequest {
  provider: AiProviderId;
  /** A model id from `AI_MODELS[provider]`, or null for the default. */
  model: string | null;
}

export interface ConnectAiKeyRequest {
  provider: AiProviderId;
  /** The key as pasted. Checked with the provider before it's stored. */
  key: string;
  /**
   * The model to save with it, so the Settings form saves in one go: an id
   * from `AI_MODELS[provider]`, `null` for the default, or left out to keep
   * whatever was picked before.
   */
  model?: string | null;
}

export interface SetPreferredAiProviderRequest {
  /** One of the user's `connected` providers. */
  provider: AiProviderId;
}
