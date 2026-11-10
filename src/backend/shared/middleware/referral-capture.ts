/**
 * Referral capture: a middleware step (see `./pipeline`).
 */
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import {
  isReferralCode,
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "@/backend/modules/referrals/domain/referral-code";
import { isUnder } from "@/backend/shared/http/path";
import { SIGN_UP_HREF } from "@/shared/routes";

import type { ProxyStep } from "./pipeline";

/**
 * Remembers a referral code from `/register?ref=<code>` until sign-up is done.
 *
 * In a cookie because sign-up is not one request: it spans Clerk's own steps
 * and, for GitHub or LinkedIn, a round trip to another site, and the query
 * string does not survive that. The dashboard claims the code on the new
 * account's first visit (see `/api/v1/referrals/claim`, which clears the
 * cookie on `path: "/"` — keep the two in step).
 *
 * A malformed `ref` is ignored rather than stored. An existing cookie is
 * overwritten: the most recent link someone opened is the one that brought
 * them.
 *
 * Adds the cookie to the response and lets the request go on, so steps after
 * this one still run.
 */
export const captureReferral: ProxyStep = (request, response) => {
  /*
   * No accounts, no referrals — as in the claim route. With auth off there is
   * no sign-up to carry a code through: `(auth)/layout.tsx` sends `/register`
   * to the dashboard.
   */
  if (!isAuthEnabled()) return;
  if (!isUnder(request.nextUrl.pathname, SIGN_UP_HREF)) return;

  const code = request.nextUrl.searchParams.get("ref");
  if (!isReferralCode(code)) return;

  response.cookies.set(REFERRAL_COOKIE, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Readable by script: the dashboard checks for it before calling the claim route.
    httpOnly: false,
  });
};
