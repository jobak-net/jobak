"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useGenericMutation, useGenericQuery } from "@/frontend/shared/api";
import { checkKeyFormat } from "@/shared/credentials";

import { retryApify, verifyToken, type ApifyAccount } from "../lib/apify-client";
import { readToken, removeToken, saveToken } from "../lib/token-store";

/** Fired on this tab when the token changes; other tabs hear the browser's own `storage` event. */
const CHANGED = "jobak:apify-token";

/** Shown when the browser won't keep the token (private window, blocked site data). */
export const STORAGE_BLOCKED_MESSAGE = "Your browser isn't keeping site data, so the token can't be saved here.";

function subscribe(onChange: () => void): () => void {
    window.addEventListener(CHANGED, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGED, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/** A primitive snapshot, so React can compare it: "blocked", "none" or "saved:<token>". */
function snapshot(accountId: string): string {
    const read = readToken(accountId);
    return read.state === "saved" ? `saved:${read.token}` : read.state;
}

export function apifyAccountKey(accountId: string) {
    return ["apify", "account", accountId] as const;
}

/**
 * The user's Apify token on this device: whether there is one, whose
 * account it is, and saving (checked with Apify first) or removing it.
 *
 * `loading` until the browser has been read, on the server and on the first
 * client render, so a user with a token never sees the locked page flash.
 */
export function useApifyToken(accountId: string) {
    const queryClient = useQueryClient();
    const raw = useSyncExternalStore(
        subscribe,
        () => snapshot(accountId),
        () => "loading",
    );

    const status = raw.startsWith("saved:") ? "saved" : (raw as "loading" | "none" | "blocked");
    const token = raw.startsWith("saved:") ? raw.slice("saved:".length) : null;

    const account = useGenericQuery<ApifyAccount>(apifyAccountKey(accountId), () => verifyToken(token ?? ""), {
        enabled: token !== null,
        staleTime: 5 * 60_000,
        retry: retryApify,
    });

    const saving = useGenericMutation<string, ApifyAccount>({
        mutationFn: async (value) => {
            const format = checkKeyFormat("apify", value);
            if (!format.ok) throw new Error(format.reason);
            const verified = await verifyToken(value.trim());
            if (!saveToken(accountId, value)) throw new Error(STORAGE_BLOCKED_MESSAGE);
            queryClient.setQueryData(apifyAccountKey(accountId), verified);
            window.dispatchEvent(new Event(CHANGED));
            return verified;
        },
    });

    const remove = useCallback(() => {
        removeToken(accountId);
        queryClient.removeQueries({ queryKey: apifyAccountKey(accountId) });
        window.dispatchEvent(new Event(CHANGED));
    }, [accountId, queryClient]);

    return {
        status,
        token,
        account: account.data ?? null,
        accountError: account.error,
        save: (value: string) => saving.mutateAsync(value).then(() => undefined),
        saving: saving.isPending,
        saveError: saving.error,
        remove,
    };
}
