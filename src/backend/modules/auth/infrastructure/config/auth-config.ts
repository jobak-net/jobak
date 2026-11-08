/**
 * Whether sign-in exists at all on this instance, and the keys it needs.
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
 * Nothing here is `NEXT_PUBLIC_`, which Next inlines into the bundle at build.
 * The proxy, the DAL and every dynamic route read these from the running
 * process. Pages Next prerenders at build — the static marketing pages — read
 * them during `next build` instead, and that decides whether `ClerkProvider`
 * wraps them. So set the same values for the build as for the container; a
 * Docker image should be built with the mode it will run in.
 *
 * No imports, so the proxy, the root layout and the composition root can all
 * read the same answer.
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

export interface ClerkKeys {
  publishableKey: string;
  secretKey: string;
}

/**
 * The Clerk keys, or a clear error naming what is missing.
 *
 * `CLERK_PUBLISHABLE_KEY` is accepted alongside the usual
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for the reason above: the public name is
 * frozen into the bundle at build, while the plain one can still be changed
 * for the proxy and dynamic routes at runtime. The publishable key is not a
 * secret — it ships to the browser either way — so passing it from the server
 * is safe.
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
