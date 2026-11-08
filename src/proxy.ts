import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";

import {
  getClerkKeys,
  isAuthEnabled,
} from "@/backend/modules/auth/infrastructure/config";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/frontend/lib/configs/cta";
// The domain file directly, not the module index: that pulls in server-only code.
import {
  isReferralCode,
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
} from "@/backend/modules/referrals/domain/referral-code";

/**
 * Request handling in front of every route.
 *
 * ── Clerk ───────────────────────────────────────────────────
 * With auth enabled, every request passes through `clerkMiddleware()`, which
 * reads the session so `auth()` works further in. It is bare on purpose: it
 * protects nothing. Route protection is `requireUser()` / `requireApiUser()` in
 * the page or handler itself — see `modules/auth/interface`.
 *
 * With `AUTH_ENABLED=false` Clerk is never called. There are no keys to give
 * it, and the local owner needs no session.
 *
 * ── Retired URLs ────────────────────────────────────────────
 * The earlier staging deployment had pages that do not exist here. Links to
 * them may still be around, and a 404 reads as a broken site, so each lands on
 * the closest thing that does exist. Password reset and email verification
 * live inside Clerk's sign-in flow now, so those URLs go to /login.
 */

/** Old path → where it lives now. Matched as a prefix. */
const RETIRED_PATHS: Record<string, string> = {
  "/forgot-password": SIGN_IN_HREF,
  "/reset-password": SIGN_IN_HREF,
  "/verify-email": SIGN_IN_HREF,
  // `/onboarding` is a real page again (app/(onboarding)), so it is not listed.
  "/settings": "/dashboard/settings",
};

function redirectRetired(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  const prefix = Object.keys(RETIRED_PATHS).find(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!prefix) return null;

  const url = request.nextUrl.clone();
  url.pathname = RETIRED_PATHS[prefix];
  // Any token or `?next=` on an old URL means nothing to the new pages.
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Remembers a referral code from `/register?ref=<code>` until sign-up is done.
 *
 * In a cookie because sign-up is not one request: it spans Clerk's own steps
 * and, for GitHub or LinkedIn, a round trip to another site, and the query
 * string does not survive that. The dashboard claims the code on the new
 * account's first visit (see `/api/v1/referrals/claim`).
 *
 * A malformed `ref` is ignored rather than stored. An existing cookie is
 * overwritten: the most recent link someone opened is the one that brought
 * them.
 */
function captureReferral(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith(SIGN_UP_HREF)) return null;

  const code = request.nextUrl.searchParams.get("ref");
  if (!isReferralCode(code)) return null;

  const response = NextResponse.next();
  response.cookies.set(REFERRAL_COOKIE, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Readable by script: the dashboard checks for it before calling the claim route.
    httpOnly: false,
  });
  return response;
}

/*
 * Built lazily rather than at module load: the keys are only required when auth
 * is enabled, and reading them at import time would fail a disabled instance
 * for keys it was never meant to have.
 */
let withClerk: NextMiddleware | undefined;

function getClerkHandler(): NextMiddleware {
  if (!withClerk) {
    /*
     * Only the publishable key is passed. Clerk reads `CLERK_SECRET_KEY` from
     * the running process itself — it is not `NEXT_PUBLIC_`, so it is never
     * frozen at build — while passing it here would make Clerk forward it
     * through the request, which demands a `CLERK_ENCRYPTION_KEY` as well.
     * `getClerkKeys()` still checks both exist, for a clear startup error.
     */
    const { publishableKey } = getClerkKeys();
    withClerk = clerkMiddleware((_auth, request) => redirectRetired(request) ?? captureReferral(request), {
      publishableKey,
      // So `redirectToSignIn()` in the DAL lands on our page, not Clerk's.
      signInUrl: SIGN_IN_HREF,
      signUpUrl: SIGN_UP_HREF,
    });
  }
  return withClerk;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isAuthEnabled()) {
    return getClerkHandler()(request, event);
  }

  return redirectRetired(request) ?? NextResponse.next();
}

export const config = {
  /*
   * Every page and API route, minus Next internals and static files.
   *
   * API routes are included because `auth()` inside a route handler depends on
   * `clerkMiddleware()` having seen the request. None of the retired paths
   * start with `/api`, so a fetch() caller is never redirected to HTML.
   */
  matcher: [
    "/((?!_next|flags|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(.*)",
  ],
};
