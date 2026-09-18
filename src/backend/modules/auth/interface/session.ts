import "server-only";

import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";

import { getAuthModule } from "../composition";
import type { PublicUser } from "../domain/entities/user.entity";
import { getAccessToken } from "../infrastructure/http/cookies";

/**
 * The Data Access Layer for auth: the one way server code asks "who is this".
 *
 * Next's own guidance is to centralise the session check here rather than rely
 * on middleware, because middleware runs before the request reaches the code
 * that actually reads data — and a check that far from the data is a check that
 * can be bypassed by any route that forgets it. See
 * `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
 *
 * Everything here is wrapped in React's `cache`, so several components in one
 * render share a single verification rather than each paying for its own. A
 * dashboard page whose layout, header and body all ask who the user is costs
 * one check, not three.
 */

/**
 * The signed-in user, or null.
 *
 * Failures resolve to null rather than throwing. This drives cosmetic decisions
 * on public marketing pages — whether the nav says "Sign in" or "Dashboard" —
 * and an unreachable database must not take the homepage down with it. Actual
 * route protection uses `requireUser` below, which does throw.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  try {
    const accessToken = await getAccessToken();
    return await getAuthModule().getCurrentUser.execute(accessToken);
  } catch (error) {
    /*
     * `cookies()` throws a DynamicServerError during static generation as a
     * control-flow signal, not as a fault. Swallowing it would hide the bail-out
     * from Next and silently make a page static that must not be, so hand Next's
     * own errors straight back before treating anything as an error of ours.
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
 * The signed-in user, or a redirect to /login.
 *
 * For anything behind authentication. Use this rather than checking
 * `getCurrentUser()` by hand: the redirect is the point, and a page that checks
 * the value but forgets to act on it renders as if signed in.
 *
 * Note this is the real gate. Proxy-level redirects are an optimisation that
 * keeps unauthenticated users from reaching the page at all; they are not what
 * makes the page safe.
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();

  if (!user) {
    // redirect() signals by throwing, so nothing after this runs.
    redirect("/login");
  }

  return user;
}

/**
 * The user's id, or a redirect. For call sites that only need the id to scope a
 * query — which is most of them, now that authorization is enforced in the
 * repository layer rather than by RLS.
 */
export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}
