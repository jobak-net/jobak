/**
 * Whether sign-in exists at all on this instance, and Clerk's public key.
 * Shared because both sides decide things on it: the root and `(auth)` layouts
 * (wrap the app in `ClerkProvider`, show the sign-in pages) and the backend
 * (the proxy, the composition root, the API routes). Imports nothing (see
 * `src/shared/README.md`).
 *
 * Nothing here is secret. The secret key, and the check that it is set, stay in
 * the backend (`backend/modules/auth/infrastructure/config`).
 *
 * ── The switch ──────────────────────────────────────────────
 * `AUTH_ENABLED=false` is for a self-hosted or local copy run by one person.
 * There is no sign-in and no sign-up: every request is the local owner, who
 * sees the dashboard and every feature straight away. Anything else — unset
 * included — means Clerk.
 *
 * Unset means *enabled* on purpose. The failure modes are not symmetrical: an
 * instance that wrongly requires sign-in shows a sign-in page, while one that
 * wrongly skips it hands its data to anyone who can reach the port. So "off" is
 * only ever an explicit choice, and missing Clerk keys are a startup error
 * rather than a quiet fallback to open access.
 *
 * ── When it is read ─────────────────────────────────────────
 * On the server only: nothing here is `NEXT_PUBLIC_`, which Next inlines into
 * the bundle at build, so in the browser these variables are empty. Client
 * components ask `useAuthEnabled()`, which the root layout fills from here.
 *
 * The proxy and every dynamic route read these from the running process. Pages
 * Next prerenders at build — the static marketing pages — read them during
 * `next build` instead, and that decides whether `ClerkProvider` wraps them. So
 * set the same values for the build as for the container; a Docker image
 * should be built with the mode it will run in.
 */

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

export function isAuthEnabled(): boolean {
  const raw = process.env.AUTH_ENABLED?.trim().toLowerCase();

  if (!raw || TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;

  /*
   * A typo ("flase", "disabled") must not silently pick a mode. Guessing "on"
   * would confuse a self-hoster with a sign-in page they meant to turn off;
   * guessing "off" would open an instance someone meant to protect.
   */
  throw new Error(
    `AUTH_ENABLED must be "true" or "false" (got "${process.env.AUTH_ENABLED}").`,
  );
}

/**
 * Clerk's publishable key, or a clear error when it is missing.
 *
 * `CLERK_PUBLISHABLE_KEY` is accepted alongside the usual
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: the public name is frozen into the
 * bundle at build, while the plain one can still be changed for the proxy and
 * dynamic routes at runtime. The key is not a secret — it ships to the browser
 * either way — so passing it from the server is safe.
 */
export function clerkPublishableKey(): string {
  const key = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Auth is enabled but CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) is not set. " +
        "Get it from the Clerk Dashboard (API keys), or set AUTH_ENABLED=false " +
        "to run this instance without sign-in.",
    );
  }
  return key;
}
