/**
 * Retired URLs: a middleware step (see `./pipeline`).
 *
 * The earlier staging deployment had pages that do not exist here. Links to
 * them may still be around, and a 404 reads as a broken site, so each lands on
 * the closest thing that does exist. Password reset and email verification
 * live inside Clerk's sign-in flow now, so those URLs go to /login.
 *
 * None of these start with `/api`, so a fetch() caller is never redirected to
 * HTML. Keep it that way.
 */
import { NextResponse } from "next/server";

import { isUnder } from "@/backend/shared/http/path";
import { SIGN_IN_HREF } from "@/shared/routes";

import type { ProxyStep } from "./pipeline";

/** Old path → where it lives now. Matched as a prefix. */
const RETIRED_PATHS: Record<string, string> = {
  "/forgot-password": SIGN_IN_HREF,
  "/reset-password": SIGN_IN_HREF,
  "/verify-email": SIGN_IN_HREF,
  // `/onboarding` is a real page again (app/(onboarding)), so it is not listed.
  "/settings": "/dashboard/settings",
};

export const redirectRetired: ProxyStep = (request) => {
  const { pathname } = request.nextUrl;

  const prefix = Object.keys(RETIRED_PATHS).find((p) => isUnder(pathname, p));
  if (!prefix) return;

  const url = request.nextUrl.clone();
  url.pathname = RETIRED_PATHS[prefix];
  // Any token or `?next=` on an old URL means nothing to the new pages.
  url.search = "";
  return NextResponse.redirect(url);
};
