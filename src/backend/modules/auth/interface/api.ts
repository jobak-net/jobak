import "server-only";

import { NextResponse } from "next/server";

import { getAuthModule } from "../composition";
import type { PublicUser } from "../domain/entities/user.entity";
import { getAccessToken } from "../infrastructure/http/cookies";

/**
 * Authenticating an API route.
 *
 * Separate from `./session`, which redirects — a route handler must answer with
 * a 401 instead, because its caller is a `fetch()` expecting JSON and an HTML
 * login page would be nonsense to it.
 *
 * Deliberately not wrapped in React's `cache`: route handlers are not a render
 * pass, so there is nothing to dedupe against and `cache` would be misleading
 * decoration.
 */

/**
 * The signed-in user, or null.
 *
 * Returns null rather than throwing so the caller decides the response — some
 * routes want a 401, others (feedback) accept anonymous callers and only use
 * the user to attribute the row.
 */
export async function getApiUser(): Promise<PublicUser | null> {
  try {
    return await getAuthModule().getCurrentUser.execute(await getAccessToken());
  } catch (error) {
    /*
     * A failure to verify is not a signed-in user. Logged rather than thrown so
     * a database blip degrades to "unauthenticated" — which the caller already
     * handles — instead of a 500 from every authenticated endpoint at once.
     */
    console.error("[auth/api] getApiUser failed", error);
    return null;
  }
}

/** The standard 401, so every route words it the same way. */
export const unauthorized = () =>
  NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );

/**
 * The signed-in user, or a 401 to return.
 *
 * Returns a tuple rather than throwing so the call site stays a plain early
 * return and TypeScript narrows `user` to non-null after the check:
 *
 *   const { user, response } = await requireApiUser();
 *   if (!user) return response;
 */
export async function requireApiUser(): Promise<
  { user: PublicUser; response: null } | { user: null; response: NextResponse }
> {
  const user = await getApiUser();

  return user
    ? { user, response: null }
    : { user: null, response: unauthorized() };
}
