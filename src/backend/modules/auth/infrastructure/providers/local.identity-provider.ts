import "server-only";

import type { ExternalIdentity } from "../../domain/entities/identity.entity";
import type { IdentityProvider } from "../../domain/ports/identity-provider.port";

/**
 * The single owner of an instance running with `AUTH_ENABLED=false`.
 *
 * Every request is this person, so a self-hoster lands on the dashboard with no
 * sign-in or sign-up. Their row in `users` is created on the first request like
 * anyone else's, which means every user-scoped table — preferences, matches,
 * saved keys — works unchanged.
 *
 * The id cannot collide with Clerk's, which are always `user_…`. Switching an
 * existing database from disabled to enabled leaves the owner's data in place
 * under this id, reachable again by switching back.
 */
export const LOCAL_OWNER_EXTERNAL_ID = "local:owner";

export class LocalIdentityProvider implements IdentityProvider {
  readonly kind = "local";

  async currentExternalId(): Promise<string> {
    return LOCAL_OWNER_EXTERNAL_ID;
  }

  async loadIdentity(externalId: string): Promise<ExternalIdentity | null> {
    if (externalId !== LOCAL_OWNER_EXTERNAL_ID) return null;

    /*
     * No email: there is no mail to send without auth, and a placeholder
     * address would sit in the unique `users.email` column looking real.
     */
    return { externalId, email: null, fullName: null };
  }
}
