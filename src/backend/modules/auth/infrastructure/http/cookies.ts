import "server-only";

import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookie-names";

import {
  ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS,
} from "../../domain/policies/token-lifetimes.policy";

/**
 * Where the tokens live in the browser.
 *
 * Cookies rather than `localStorage`, and `httpOnly` ones: script cannot read
 * them, so an XSS bug cannot exfiltrate a session. The trade is that they ride
 * along on every same-site request, which is what `sameSite` below is for.
 *
 * All of it is confined to this file so the flags are decided once. A cookie
 * set correctly in one route and carelessly in another is a hole that reviews
 * do not reliably catch.
 */

/*
 * Re-exported from `./cookie-names`, where they live without any imports so the
 * proxy can read them without pulling in `next/headers` or `server-only`.
 */
export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookie-names";

/**
 * `secure` is skipped in development because local Next serves over plain HTTP
 * and the browser would silently drop the cookie — a confusing "login does
 * nothing" failure. Any deployed environment gets it.
 */
const isProduction = () => process.env.NODE_ENV === "production";

/**
 * `lax`, not `strict`.
 *
 * `strict` withholds cookies on any cross-site navigation, including following
 * a link from an email or another site — so a signed-in user arriving that way
 * lands logged out, which reads as a bug. `lax` sends them on top-level GET
 * navigations only, which keeps that working while still withholding them from
 * the cross-site POSTs that CSRF relies on.
 */
const SAME_SITE = "lax" as const;

const baseOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: SAME_SITE,
  path: "/",
});

/**
 * Access and refresh cookies, written together.
 *
 * `maxAge` mirrors the token lifetimes from the policy file rather than
 * repeating literals — if the cookie outlived the token the browser would keep
 * sending something already rejected, and if it expired first the user would be
 * signed out early with a still-valid token in hand.
 *
 * Only callable from a Server Action or Route Handler; Next throws if a Server
 * Component tries to set a cookie, since the response headers are already gone.
 */
export async function setAuthCookies(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const store = await cookies();

  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseOptions(),
    maxAge: ACCESS_TOKEN_TTL_MINUTES * 60,
  });

  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Clears both cookies on sign-out.
 *
 * Uses `set` with an empty value and `maxAge: 0` rather than `delete`: deletion
 * only takes effect when the attributes match what was written, and an
 * expired-in-the-past overwrite is the more reliable instruction. The flags are
 * repeated for exactly that reason.
 *
 * Note this only clears the browser's copy. The refresh token must also be
 * revoked server-side — a cookie the user discards is still a valid credential
 * if someone else kept a copy.
 */
export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();

  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    store.set(name, "", { ...baseOptions(), maxAge: 0 });
  }
}
