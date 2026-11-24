/**
 * Where the user's Apify token lives: this browser's `localStorage`, under a
 * key per Jobak account, so two accounts on one browser never share a token.
 * It is never sent to Jobak's server.
 *
 * Storage can be missing or throw (a private window, blocked site data), so
 * every access is guarded: a failure reads as `blocked`, never as a crash.
 */

export type TokenRead = { state: "saved"; token: string } | { state: "none" } | { state: "blocked" };

export function tokenKey(accountId: string): string {
    return `jobak.apify-token.${accountId}`;
}

/** The browser's `localStorage`, or undefined where there is none or touching it throws. */
export function browserStorage(): Storage | undefined {
    try {
        return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
        return undefined;
    }
}

export function readToken(accountId: string, storage: Storage | undefined = browserStorage()): TokenRead {
    if (!storage) return { state: "blocked" };
    try {
        const token = storage.getItem(tokenKey(accountId))?.trim();
        return token ? { state: "saved", token } : { state: "none" };
    } catch {
        return { state: "blocked" };
    }
}

/** False when the browser won't keep it. */
export function saveToken(accountId: string, token: string, storage: Storage | undefined = browserStorage()): boolean {
    if (!storage) return false;
    try {
        storage.setItem(tokenKey(accountId), token.trim());
        return true;
    } catch {
        return false;
    }
}

export function removeToken(accountId: string, storage: Storage | undefined = browserStorage()): void {
    try {
        storage?.removeItem(tokenKey(accountId));
    } catch {
        /* nothing kept, nothing to remove */
    }
}
