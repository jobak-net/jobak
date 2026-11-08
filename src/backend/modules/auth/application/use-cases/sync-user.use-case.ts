import type { ExternalIdentity } from "../../domain/entities/identity.entity";
import type { UserRepository } from "../../domain/ports/user.repository";

/**
 * Applying a change the identity provider reported.
 *
 * Driven by Clerk's webhooks. Both operations are idempotent, because webhook
 * delivery is at-least-once: a retried `user.updated` rewrites the same values,
 * and a retried `user.deleted` deletes nothing.
 *
 * Creation is not this use case's job. `GetCurrentUserUseCase` provisions the
 * row on first sight, so `user.created` arriving late — or never — costs
 * nothing. Handling it here as an upsert is only so the row exists before the
 * person's first request, which is harmless either way.
 */
export class SyncUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async upsert(identity: ExternalIdentity): Promise<void> {
    await this.users.upsert(identity);
  }

  async remove(externalId: string): Promise<void> {
    await this.users.deleteByExternalId(externalId);
  }
}
