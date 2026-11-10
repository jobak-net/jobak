/**
 * The auth session around the middleware pipeline: Clerk's, or none.
 *
 * Not a step but the wrapper the steps run inside (see `./pipeline` for what
 * may be imported here).
 *
 * ── Clerk ───────────────────────────────────────────────────
 * With auth enabled, every request passes through `clerkMiddleware()`, which
 * reads the session so `auth()` works further in. It is bare on purpose: it
 * protects nothing. Route protection is `requireUser()` / `requireApiUser()` in
 * the page or handler itself.
 *
 * With `AUTH_ENABLED=false` Clerk is never called. There are no keys to give
 * it, and the local owner needs no session.
 */
import { clerkMiddleware } from "@clerk/nextjs/server";
import type {
  NextFetchEvent,
  NextMiddleware,
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getClerkKeys,
  isAuthEnabled,
} from "@/backend/modules/auth/infrastructure/config";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/shared/routes";

/** What the proxy does with a request once the session has been read. */
export type RequestHandler = (
  request: NextRequest,
) => NextResponse | Promise<NextResponse>;

/**
 * Wraps `handler` in the Clerk session when auth is on, and runs it bare when
 * auth is off. The mode is read per request, like everywhere else.
 */
export function withAuthSession(handler: RequestHandler): NextMiddleware {
  /*
   * Built lazily rather than when the proxy loads: the keys are only required
   * when auth is enabled, and reading them at import time would fail a disabled
   * instance for keys it was never meant to have.
   */
  let withClerk: NextMiddleware | undefined;

  return (request: NextRequest, event: NextFetchEvent) => {
    if (!isAuthEnabled()) return handler(request);

    if (!withClerk) {
      /*
       * Only the publishable key is passed. Clerk reads `CLERK_SECRET_KEY` from
       * the running process itself — it is not `NEXT_PUBLIC_`, so it is never
       * frozen at build — while passing it here would make Clerk forward it
       * through the request, which demands a `CLERK_ENCRYPTION_KEY` as well.
       * `getClerkKeys()` still checks both exist, so a missing key fails the
       * first request with an error that names it.
       */
      const { publishableKey } = getClerkKeys();
      withClerk = clerkMiddleware((_auth, req) => handler(req), {
        publishableKey,
        // So `redirectToSignIn()` in the DAL lands on our page, not Clerk's.
        signInUrl: SIGN_IN_HREF,
        signUpUrl: SIGN_UP_HREF,
      });
    }
    return withClerk(request, event);
  };
}
