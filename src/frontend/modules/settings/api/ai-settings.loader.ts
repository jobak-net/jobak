import "server-only";

import { serverFetch } from "@/frontend/shared/api/server";
import { AI_SETTINGS_API_PATH, type AiSettingsResponse } from "@/shared/contracts/ai-settings";

/**
 * The user's AI settings for the Settings page: `GET /api/v1/ai-settings`.
 *
 * Awaited by the page: the AI tab opens on the connected provider, so it
 * needs the answer before it renders. Resolves to null when the read fails
 * (`serverFetch` logs it): the AI tab then says so, and the other tabs still
 * work — a failed read of one setting shouldn't take the whole page to the
 * error boundary. Also read by the dashboard (is an AI connected yet?).
 */
export async function loadAiSettings(): Promise<AiSettingsResponse | null> {
  const result = await serverFetch<AiSettingsResponse>(AI_SETTINGS_API_PATH);
  return result.kind === "ok" ? result.data : null;
}
