/**
 * The Clerk keys the backend needs, and the warning for running without auth.
 *
 * The switch itself (`AUTH_ENABLED`) and the publishable key are read in
 * `@/shared/auth`, because the frontend's layouts need them too. The switch is
 * re-exported here so backend code keeps one import. The secret key never
 * leaves the backend.
 *
 * Imports only from `@/shared`, so the proxy, the root layout and the
 * composition root can all read the same answer.
 */
import { isAuthEnabled } from "@/shared/auth";

export { isAuthEnabled };

export interface ClerkKeys {
  publishableKey: string;
  secretKey: string;
}

/**
 * The Clerk keys, or a clear error naming what is missing. Both are checked
 * together so one message names everything to set. (The publishable key is
 * read the same way as `clerkPublishableKey()` in `@/shared/auth`: either
 * `CLERK_PUBLISHABLE_KEY` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.)
 */
export function getClerkKeys(): ClerkKeys {
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  const missing = [
    !publishableKey && "CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)",
    !secretKey && "CLERK_SECRET_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Auth is enabled but ${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} not set. ` +
        "Get them from the Clerk Dashboard (API keys), or set AUTH_ENABLED=false " +
        "to run this instance without sign-in.",
    );
  }

  return { publishableKey: publishableKey!, secretKey: secretKey! };
}

const globalForAuthConfig = globalThis as unknown as {
  authDisabledWarned?: boolean;
};

/**
 * Says so, once per process, when auth is off.
 *
 * Disabled mode means anyone who can reach this server is the owner, with the
 * owner's saved API keys and data. That is the intended trade for a copy on
 * your own machine, and a dangerous one for a copy on the open internet — so it
 * is announced rather than assumed understood.
 */
export function warnIfAuthDisabled(): void {
  if (isAuthEnabled() || globalForAuthConfig.authDisabledWarned) return;
  globalForAuthConfig.authDisabledWarned = true;

  console.warn(
    "[auth] AUTH_ENABLED=false — sign-in is off and every visitor acts as the " +
      "local owner. Only expose this instance on localhost or behind your own " +
      "access control (VPN, reverse-proxy auth).",
  );
}
