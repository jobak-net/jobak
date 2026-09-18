import { NextResponse, type NextRequest } from "next/server";

/**
 * Route handling for the pre-launch site.
 *
 * ── What this used to do ────────────────────────────────────
 * It guarded `/dashboard`, `/onboarding` and `/settings` by checking for an
 * auth cookie, and bounced signed-in visitors away from the auth pages. None of
 * those routes exist while the product is a waitlist, so all of it is gone.
 *
 * What remains is a redirect for the old URLs. They were live in the staging
 * deployment and may be linked from somewhere, and a 404 on `/login` reads as a
 * broken site rather than as "not open yet" — which is the wrong impression to
 * give someone arriving from a LinkedIn post.
 *
 * The auth module itself is deliberately untouched: it is finished, tested, and
 * needed the moment the waitlist opens. Only its routes are withdrawn.
 */

/** Paths that existed before the waitlist launch. */
const RETIRED_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/onboarding",
  "/settings",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RETIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    /*
     * Anchored at the waitlist form, so someone who came looking for a sign-in
     * lands on the thing they can actually do. `search` is cleared because any
     * `?next=` or token on a retired URL is meaningless now.
     */
    url.hash = "waitlist";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Everything except static assets and API routes.
   *
   * API routes are excluded because they answer in JSON — a redirect to a
   * marketing page is useless to a fetch() caller, which would see HTML where
   * it expected a response body.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|flags|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
