import type { ExternalIdentity } from "../entities/identity.entity";

/**
 * Who is making this request, according to whoever does sign-in.
 *
 * Two implementations: Clerk, and the local owner used when a self-hosted
 * instance runs with `AUTH_ENABLED=false`. Everything above this port — the use
 * cases, the DAL, every action that scopes by user id — is the same in both.
 *
 * Split into two calls because their costs differ by a network round trip.
 * With Clerk, reading the id comes from the verified session token on the
 * request, while the profile is a Backend API call. The id is needed on every
 * request; the profile only the first time we meet someone.
 */
export interface IdentityProvider {
  /** Which provider this is. The DAL needs it to decide how to send someone to sign in. */
  readonly kind: "clerk" | "local";

  /**
   * The signed-in person's provider id, or null when nobody is signed in.
   *
   * Never throws for a missing or invalid session — that is the ordinary state
   * of a public page. It may throw for a misconfigured provider, which is not.
   */
  currentExternalId(): Promise<string | null>;

  /** The full profile for an id, or null if the provider no longer knows it. */
  loadIdentity(externalId: string): Promise<ExternalIdentity | null>;
}
