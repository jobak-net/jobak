import type { IdentityEvent } from "../../domain/entities/identity-event.entity";
import type { IdentityWebhook } from "../../domain/ports/identity-webhook.port";
import type { UserRepository } from "../../domain/ports/user.repository";

/**
 * Keeping `users` in step with the identity provider: a webhook delivery in,
 * the matching change to `users` out.
 *
 * The `IdentityWebhook` adapter (Clerk's, today) proves the delivery is genuine
 * and translates it; this applies it. Both writes are idempotent, because
 * webhook delivery is at-least-once: a retried "updated" rewrites the same
 * values, and a retried "deleted" deletes nothing. A thrown error (a database
 * blip) reaches the caller, and the provider retries on its schedule.
 *
 * Creation is not this use case's job. `GetCurrentUserUseCase` provisions the
 * row on first sight, so a "created" arriving late — or never — costs
 * nothing. Handling it as an upsert here is only so the row exists before the
 * person's first request, which is harmless either way. What *does* depend on
 * this is deletion: without it a removed account's preferences, matches and
 * saved keys would outlive it.
 */
export class SyncUserUseCase {
  constructor(
    private readonly webhook: IdentityWebhook,
    private readonly users: UserRepository,
  ) {}

  /** Verifies a delivery and applies it. Returns what happened. */
  async execute(delivery: Request): Promise<IdentityEvent["type"]> {
    const event = await this.webhook.receive(delivery);

    switch (event.type) {
      case "upserted":
        await this.users.upsert(event.identity);
        break;
      case "deleted":
        await this.users.deleteByExternalId(event.externalId);
        break;
      case "ignored":
        break;
    }
    return event.type;
  }
}
