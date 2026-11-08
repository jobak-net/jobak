import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getAuthModule } from "../composition";
import type { PublicUser } from "../domain/entities/user.entity";

/**
 * The Data Access Layer for auth: the one way server code asks "who is this".
 *
 * Next's own guidance is to centralise the session check here rather than rely
 * on the proxy, because the proxy runs before the request reaches the code that
 * actually reads data — and a check that far from the data is a check that can
 * be bypassed by any route that forgets it. See
 * `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
 *
 * Identical in both auth modes. With `AUTH_ENABLED=false` every call resolves
 * to the local owner, so `requireUser` never redirects and every page and
 * action behaves as signed in.
 *
 * Everything here is wrapped in React's `cache`, so several components in one
 * render share a single lookup rather than each paying for its own.
 */

/**
 * The lookup itself, shared by both entry points below and cached per request.
 *
 * Throws when the lookup fails. The two callers then deal with that
 * differently, which is the whole reason this is split out: a cosmetic check
 * can shrug a failure off, a gate cannot.
 */
const resolveCurrentUser = cache(
  (): Promise<PublicUser | null> => getAuthModule().getCurrentUser.execute(),
);

/**
 * Raised by `requireUser` when we could not find out who the user is — the
 * database timing out, typically — as opposed to finding out that nobody is
 * signed in. Pages show an error for this rather than a sign-in redirect.
 */
export class UserLookupError extends Error {
  constructor(cause: unknown) {
    super("Could not load the current user. Is the database reachable?", { cause });
    this.name = "UserLookupError";
  }
}

/**
 * The signed-in user, or null.
 *
 * Failures resolve to null rather than throwing. This drives cosmetic decisions
 * on public pages — whether the nav says "Sign in" or "Dashboard" — and an
 * unreachable database must not take the homepage down with it. Actual route
 * protection uses `requireUser` below.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  try {
    return await resolveCurrentUser();
  } catch (error) {
    /*
     * Reading the request throws a DynamicServerError during static generation
     * as a control-flow signal, not as a fault. Swallowing it would hide the
     * bail-out from Next and silently make a page static that must not be, so
     * hand Next's own errors straight back before treating anything as ours.
     */
    unstable_rethrow(error);
    console.error("[auth/session] getCurrentUser failed", error);
    return null;
  }
});

/** Convenience for the many places that only need the boolean. */
export const isSignedIn = cache(async (): Promise<boolean> =>
  Boolean(await getCurrentUser()),
);

/**
 * The signed-in user, or a redirect to sign in.
 *
 * For anything behind authentication. Use this rather than checking
 * `getCurrentUser()` by hand: the redirect is the point, and a page that checks
 * the value but forgets to act on it renders as if signed in.
 *
 * Note this is the real gate. The proxy does not protect routes; this does.
 *
 * ── Failure is not "signed out" ─────────────────────────────
 * Only a successful lookup that finds nobody redirects to sign in. A lookup
 * that fails throws `UserLookupError` instead. Treating a database timeout as
 * signed out caused a loop: the user *is* signed in with Clerk, so /login
 * bounced them straight back here, which failed again, indefinitely.
 */
export async function requireUser(): Promise<PublicUser> {
  let user: PublicUser | null;
  try {
    user = await resolveCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth/session] requireUser lookup failed", error);
    throw new UserLookupError(error);
  }

  if (user) return user;

  if (getAuthModule().identity.kind === "clerk") {
    // Throws to redirect, to whichever sign-in URL the Clerk instance uses.
    return (await auth()).redirectToSignIn();
  }

  /*
   * With auth disabled the owner always resolves, so null here means the
   * provider returned no identity — not a state any sign-in page can fix.
   */
  throw new UserLookupError(new Error("Local owner did not resolve"));
}

/**
 * The user's id, or a redirect. For call sites that only need the id to scope a
 * query — which is most of them, since authorization is enforced in the
 * repository layer rather than by RLS.
 */
export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}
