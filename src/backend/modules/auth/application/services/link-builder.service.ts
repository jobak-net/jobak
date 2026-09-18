/**
 * Builds the absolute links that go into auth emails.
 *
 * A small service rather than string concatenation at each call site, because
 * these must be absolute — a relative path in an email client resolves against
 * nothing — and because the base URL differs per environment. Getting it wrong
 * produces links that 404 in preview or point at localhost in production, both
 * of which are only noticed by a user who cannot get in.
 */
export class VerificationLinkBuilder {
  constructor(private readonly baseUrl: string) {}

  emailVerification(token: string): string {
    return this.build("/api/v1/auth/verify-email", token);
  }

  passwordReset(token: string): string {
    return this.build("/reset-password", token);
  }

  private build(path: string, token: string): string {
    const url = new URL(path, this.baseUrl);
    // `URL` percent-encodes the value, so a base64url token survives intact.
    url.searchParams.set("token", token);
    return url.toString();
  }
}

/**
 * The public origin of this deployment.
 *
 * Checked in order:
 *   AUTH_APP_URL        — explicit override, wins everywhere
 *   NEXT_PUBLIC_APP_URL — the app's own canonical URL, if configured
 *   localhost:3000      — development default
 *
 * ── No host-specific fallback ───────────────────────────────
 * This used to fall back to `VERCEL_URL`, which meant preview deployments
 * worked without configuration. That was removed to keep the app deployable
 * anywhere: nothing here should assume a particular host.
 *
 * The cost is that `AUTH_APP_URL` must now be set explicitly in every deployed
 * environment, previews included. That is the intended trade — an unset
 * variable fails loudly below rather than silently producing links to a
 * hostname that only one platform would have supplied.
 *
 * Throws in production rather than falling through to localhost: a verification
 * email pointing at localhost is worse than a failed deploy, because it fails
 * silently and only for the user.
 */
export function resolveBaseUrl(): string {
  const explicit = process.env.AUTH_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return stripTrailingSlash(explicit);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_APP_URL is not set. Auth emails need an absolute origin " +
        "(e.g. https://jobak.net); falling back to localhost would send " +
        "users links that cannot work.",
    );
  }

  return "http://localhost:3000";
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");
