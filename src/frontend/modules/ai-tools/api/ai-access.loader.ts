import "server-only";

import { loadAiSettings } from "@/frontend/modules/settings/server";

export interface AiAccess {
    /** The user has at least one saved AI key, or we couldn't tell. */
    unlocked: boolean;
}

/**
 * Whether the AI tools are open to this user: `GET /api/v1/ai-settings`
 * (through the settings module's loader) has a connected provider.
 *
 * Decided on the server, so a tool page renders locked or unlocked from the
 * first paint. When the settings can't be read the tools stay **unlocked**:
 * locking on a guess would hide the tools from someone whose key is fine, and
 * a tool run without a key is refused by the API anyway (`ai-not-connected`).
 */
export async function loadAiAccess(): Promise<AiAccess> {
    const settings = await loadAiSettings();
    return { unlocked: settings === null || settings.connected.length > 0 };
}
