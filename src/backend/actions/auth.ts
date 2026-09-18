"use server";

import { redirect } from "next/navigation";
import { getAuthModule } from "@/backend/modules/auth/composition";
import { getCurrentUser } from "@/backend/modules/auth/interface";
import {
  clearAuthCookies,
  getRefreshToken,
} from "@/backend/modules/auth/infrastructure/http";

/**
 * Ends the session and clears the cookies.
 *
 * Kept as a server action because both call sites use `<form action={signOut}>`,
 * which works without JavaScript — a sign-out that depends on a fetch handler
 * would silently do nothing if the bundle failed to load, leaving someone
 * apparently unable to log out.
 */
export async function signOut() {
  const refreshToken = await getRefreshToken();

  await getAuthModule().logout.execute(refreshToken);
  await clearAuthCookies();

  redirect("/login");
}

/**
 * The signed-in user, or null.
 *
 * Retained under this name because callers already import it; it now delegates
 * to the auth module's DAL, which is `cache`d — so several components asking in
 * one render share a single verification.
 *
 * `getSession()` is gone: nothing used it, and exposing a raw session object
 * invited callers to read token fields that are no longer theirs to see.
 */
export async function getUser() {
  return getCurrentUser();
}
