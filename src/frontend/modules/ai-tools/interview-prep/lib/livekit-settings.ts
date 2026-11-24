import { TokenSource } from "livekit-client";

/**
 * The user's LiveKit setup for interview practice, kept in this browser per
 * account: their token server ID and the name of the interviewer agent they
 * deployed. No API key or secret: tokens come from LiveKit's token server,
 * a setting on the user's own LiveKit project.
 *
 * Storage can be missing or throw (a private window, blocked site data), so
 * every access is guarded: a failure reads as `blocked`, never as a crash.
 */

export interface LiveKitSettings {
    tokenServerId: string;
    agentName: string;
    /** The project's address, as LiveKit returned it when the ID was checked (`wss://<project>.livekit.cloud`). Shown, never typed. */
    serverUrl?: string;
}

export type SettingsRead = { state: "saved"; settings: LiveKitSettings } | { state: "none" } | { state: "blocked" };

export const settingsKey = (accountId: string) => `jobak.livekit.${accountId}`;

export function browserStorage(): Storage | undefined {
    try {
        return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
        return undefined;
    }
}

function clean(settings: LiveKitSettings): LiveKitSettings | null {
    const tokenServerId = typeof settings?.tokenServerId === "string" ? settings.tokenServerId.trim() : "";
    const agentName = typeof settings?.agentName === "string" ? settings.agentName.trim() : "";
    const serverUrl = typeof settings?.serverUrl === "string" ? settings.serverUrl.trim() : "";
    if (!tokenServerId || !agentName) return null;
    return projectHost(serverUrl) ? { tokenServerId, agentName, serverUrl } : { tokenServerId, agentName };
}

/** "job-abc.livekit.cloud" from "wss://job-abc.livekit.cloud"; null when it isn't a ws(s)/http(s) URL. */
export function projectHost(serverUrl: string | undefined): string | null {
    if (!serverUrl) return null;
    try {
        const url = new URL(serverUrl);
        return /^(wss?|https?):$/.test(url.protocol) && url.hostname ? url.hostname : null;
    } catch {
        return null;
    }
}

/**
 * True when what was pasted as the token server ID is a URL: LiveKit shows
 * the Token server URL right under the ID, and it's easy to copy the wrong
 * one. The URL is the same for every project, so it can't stand in for the ID.
 */
export function looksLikeUrl(value: string): boolean {
    const v = value.trim();
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v);
}

export function readLiveKitSettings(accountId: string, storage: Storage | undefined = browserStorage()): SettingsRead {
    if (!storage) return { state: "blocked" };
    let raw: string | null;
    try {
        raw = storage.getItem(settingsKey(accountId));
    } catch {
        return { state: "blocked" };
    }
    if (!raw) return { state: "none" };
    try {
        const settings = clean(JSON.parse(raw) as LiveKitSettings);
        return settings ? { state: "saved", settings } : { state: "none" };
    } catch {
        return { state: "none" };
    }
}

/** False when a value is blank or the browser won't keep it. */
export function saveLiveKitSettings(accountId: string, settings: LiveKitSettings, storage: Storage | undefined = browserStorage()): boolean {
    const cleaned = clean(settings);
    if (!cleaned || !storage) return false;
    try {
        storage.setItem(settingsKey(accountId), JSON.stringify(cleaned));
        return true;
    } catch {
        return false;
    }
}

export function removeLiveKitSettings(accountId: string, storage: Storage | undefined = browserStorage()): void {
    try {
        storage?.removeItem(settingsKey(accountId));
    } catch {
        /* nothing kept, nothing to remove */
    }
}

/** Why the token server couldn't be used: LiveKit refused it, or couldn't be reached. */
export class LiveKitSetupError extends Error {
    constructor(
        readonly kind: "rejected" | "network" | "url",
        message: string,
    ) {
        super(message);
        this.name = "LiveKitSetupError";
    }
}

/** The SDK's token errors read "... received 401 / ..."; a 4xx means LiveKit refused the ID. */
export function toSetupError(error: unknown): LiveKitSetupError {
    const message = error instanceof Error ? error.message : String(error);
    const status = Number(/received (\d{3})/.exec(message)?.[1] ?? 0);
    return new LiveKitSetupError(status >= 400 && status < 500 ? "rejected" : "network", message);
}

/**
 * Checks a token server ID by asking it for a token with no agent: it starts
 * no agent and costs nothing. Returns the project's URL from LiveKit's
 * answer, so the user never has to find or type it. Throws `LiveKitSetupError`.
 */
export async function checkTokenServer(tokenServerId: string): Promise<string> {
    if (looksLikeUrl(tokenServerId)) throw new LiveKitSetupError("url", "a URL was pasted instead of the token server ID");
    try {
        const { serverUrl } = await TokenSource.developmentTokenServer(tokenServerId.trim()).fetch({
            roomName: `jobak-check-${crypto.randomUUID()}`,
            participantName: "check",
        });
        return serverUrl;
    } catch (error) {
        throw toSetupError(error);
    }
}
