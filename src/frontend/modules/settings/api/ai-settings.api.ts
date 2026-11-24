import { clientFetch, unwrap } from "@/frontend/shared/api";
import type { AiProviderId } from "@/shared/ai";
import {
  AI_PREFERRED_API_PATH,
  AI_SETTINGS_API_PATH,
  aiKeyApiPath,
  type AiSettingsResponse,
  type UpdateAiModelRequest,
} from "@/shared/contracts/ai-settings";

/*************** Mutations ***************/

/**
 * Picks the model for one provider (`model: null` = its default):
 * `PUT /api/v1/ai-settings`. Resolves with what is now stored; throws an
 * `ApiError` on failure.
 */
export async function setAiModel(request: UpdateAiModelRequest): Promise<AiSettingsResponse> {
  return unwrap(await clientFetch<AiSettingsResponse>(AI_SETTINGS_API_PATH, { method: "PUT", body: request }));
}

/** Forgets one provider's key: `DELETE /api/v1/ai-settings/key/[provider]`. */
export async function removeAiKey(provider: AiProviderId): Promise<AiSettingsResponse> {
  return unwrap(await clientFetch<AiSettingsResponse>(aiKeyApiPath(provider), { method: "DELETE" }));
}

/** Which saved key the AI tools use: `PUT /api/v1/ai-settings/preferred`. `ai-not-connected` without one. */
export async function setPreferredAiProvider(provider: AiProviderId): Promise<AiSettingsResponse> {
  return unwrap(await clientFetch<AiSettingsResponse>(AI_PREFERRED_API_PATH, { method: "PUT", body: { provider } }));
}
