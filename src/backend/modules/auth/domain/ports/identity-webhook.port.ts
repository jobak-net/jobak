import type { IdentityEvent } from "../entities/identity-event.entity";

/**
 * Deliveries from the identity provider: "this person changed / was deleted".
 *
 * The adapter proves a delivery is genuine (the provider's signature) and
 * translates the provider's payload into an `IdentityEvent`. Everything after
 * that — what to do with it — is the sync use case's, and provider-neutral.
 */
export interface IdentityWebhook {
  /**
   * The verified event in our terms. Throws a `ValidationError` when the
   * delivery isn't genuine (bad or missing signature).
   */
  receive(delivery: Request): Promise<IdentityEvent>;
}
