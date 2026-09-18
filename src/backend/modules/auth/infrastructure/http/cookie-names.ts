/**
 * The auth cookie names, on their own.
 *
 * Split out of `cookies.ts` because the proxy needs to know what to look for,
 * and `cookies.ts` imports `next/headers` and `server-only` — neither of which
 * belongs in the proxy, which runs on every request and handles the request
 * object directly rather than through the `cookies()` store.
 *
 * Constants only: no imports, so this is safe to pull in from anywhere.
 */

export const ACCESS_TOKEN_COOKIE = "jobak_access";
export const REFRESH_TOKEN_COOKIE = "jobak_refresh";
