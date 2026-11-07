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
 * The signed-in user, or null.
 *
 * Failures resolve to null rather than throwing. This drives cosmetic decisions
 * on public pages — whether the nav says "Sign in" or "Dashboard" — and an
 * unreachable database must not take the homepage down with it. Actual route
 * protection uses `requireUser` below.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  try {
    return await getAuthModule().getCurrentUser.execute();
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
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (user) return user;

  if (getAuthModule().identity.kind === "clerk") {
    // Throws to redirect, to whichever sign-in URL the Clerk instance uses.
    return (await auth()).redirectToSignIn();
  }

  /*
   * With auth disabled there is no sign-in to send anyone to — the owner is
   * always "signed in", so getting here means the lookup itself failed (the
   * database being down). A redirect would loop; an error page says what is
   * actually wrong.
   */
  throw new Error("Could not load the local owner. Is the database reachable?");
}

/**
 * The user's id, or a redirect. For call sites that only need the id to scope a
 * query — which is most of them, since authorization is enforced in the
 * repository layer rather than by RLS.
 */
export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}
