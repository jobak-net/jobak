import { clientFetch, unwrap } from "@/frontend/shared/api";
import { AI_KEY_API_PATH, type AiSettingsResponse, type ConnectAiKeyRequest } from "@/shared/contracts/ai-settings";

/*************** Mutations ***************/

/**
 * Connects an AI provider: `PUT /api/v1/ai-settings/key`. The server checks
 * the key with the provider, then stores it encrypted.
 *
 * Resolves with the user's AI settings (which providers are connected — never
 * the key). Throws an `ApiError`: `ai-key-rejected` when the provider refused
 * it, `rate-limited` / `ai-provider-limited` when to wait.
 */
export async function connectAiKey(request: ConnectAiKeyRequest): Promise<AiSettingsResponse> {
  return unwrap(await clientFetch<AiSettingsResponse>(AI_KEY_API_PATH, { method: "PUT", body: request }));
}
