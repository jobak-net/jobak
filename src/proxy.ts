import { withAuthSession } from "@/backend/shared/middleware/auth-session";
import { runSteps } from "@/backend/shared/middleware/pipeline";
import { captureReferral } from "@/backend/shared/middleware/referral-capture";
import { redirectRetired } from "@/backend/shared/middleware/retired-paths";

/**
 * Request handling in front of every route: these steps, in order, inside the
 * auth session.
 *
 * To add one, write a `ProxyStep` in `backend/shared/middleware/` (see
 * `pipeline.ts` for the contract and the import rules) and list it here. Steps
 * that end the request, like redirects, go first, so no work is done for a
 * request that is about to leave.
 */
export const proxy = withAuthSession(
  runSteps([
    redirectRetired,
    captureReferral,
  ]),
);

export const config = {
  /*
   * Every page and API route, minus Next internals and static files.
   *
   * API routes are included because `auth()` inside a route handler depends on
   * `clerkMiddleware()` having seen the request.
   *
   * Must stay a literal here: Next reads the matcher at build time and ignores
   * anything imported or computed.
   */
  matcher: [
    "/((?!_next|flags/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(.*)",
  ],
};
