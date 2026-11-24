import type { PublicUser } from "../../domain/entities/user.entity";
import { toPublicUser } from "../../domain/entities/user.entity";
import type { IdentityProvider } from "../../domain/ports/identity-provider.port";
import type { UserRepository } from "../../domain/ports/user.repository";

/**
 * Resolve the request to our user row, creating it the first time.
 *
 * This is the read path behind every "is this request authenticated" question,
 * so the common case is shaped to be cheap: one id read from the provider (no
 * network, with Clerk) and one indexed lookup.
 *
 * ── Just-in-time provisioning ───────────────────────────────
 * Someone who has just signed up has a provider identity but no row yet. Rather
 * than waiting for the `user.created` webhook — which is asynchronous, can lag,
 * and does not exist at all in local mode — the row is created here on first
 * sight. The webhook then only has to keep it fresh and handle deletion.
 *
 * Returns null rather than throwing when nobody is signed in: that is the
 * ordinary state of a public page, not an error.
 */
export class GetCurrentUserUseCase {
  constructor(
    private readonly identity: IdentityProvider,
    private readonly users: UserRepository,
  ) {}

  async execute(): Promise<PublicUser | null> {
    const externalId = await this.identity.currentExternalId();
    if (!externalId) return null;

    const existing = await this.users.findByExternalId(externalId);
    if (existing) return toPublicUser(existing);

    /*
     * A session for an id the provider no longer knows — deleted between the
     * token being issued and now. Treated as signed out rather than recreated
     * from nothing, which would resurrect a deleted account.
     */
    const profile = await this.identity.loadIdentity(externalId);
    if (!profile) return null;

    return toPublicUser(await this.users.upsert(profile));
  }
}
