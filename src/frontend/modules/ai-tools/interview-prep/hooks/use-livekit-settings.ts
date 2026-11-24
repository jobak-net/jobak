"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useGenericMutation } from "@/frontend/shared/api";

import {
    checkTokenServer,
    readLiveKitSettings,
    removeLiveKitSettings,
    saveLiveKitSettings,
    type LiveKitSettings,
} from "../lib/livekit-settings";

/** Fired on this tab when the settings change; other tabs hear the browser's own `storage` event. */
const CHANGED = "jobak:livekit-settings";

export const LIVEKIT_STORAGE_BLOCKED_MESSAGE = "Your browser isn't keeping site data, so your LiveKit setup can't be saved here.";

function subscribe(onChange: () => void): () => void {
    window.addEventListener(CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGED, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/** A primitive snapshot React can compare: "blocked", "none" or "saved:<json>". */
function snapshot(accountId: string): string {
    const read = readLiveKitSettings(accountId);
    return read.state === "saved" ? `saved:${JSON.stringify(read.settings)}` : read.state;
}

/**
 * The user's LiveKit setup on this device: whether there is one, saving it
 * (the token server ID checked with LiveKit first) and removing it.
 * `loading` until the browser has been read, so the lock never flashes.
 */
export function useLiveKitSettings(accountId: string) {
    const raw = useSyncExternalStore(
        subscribe,
        () => snapshot(accountId),
        () => "loading",
    );
    const status = raw.startsWith("saved:") ? "saved" : (raw as "loading" | "none" | "blocked");
    const settings = raw.startsWith("saved:") ? (JSON.parse(raw.slice("saved:".length)) as LiveKitSettings) : null;

    const saving = useGenericMutation<LiveKitSettings, void>({
        mutationFn: async (next) => {
            if (!next.tokenServerId.trim() || !next.agentName.trim()) throw new Error("Fill in both the token server ID and the agent name.");
            const serverUrl = await checkTokenServer(next.tokenServerId);
            if (!saveLiveKitSettings(accountId, { ...next, serverUrl })) throw new Error(LIVEKIT_STORAGE_BLOCKED_MESSAGE);
            window.dispatchEvent(new Event(CHANGED));
        },
    });

    const remove = useCallback(() => {
        removeLiveKitSettings(accountId);
        window.dispatchEvent(new Event(CHANGED));
    }, [accountId]);

    return {
        status,
        settings,
        save: (next: LiveKitSettings) => saving.mutateAsync(next),
        saving: saving.isPending,
        saveError: saving.error,
        remove,
    };
}
