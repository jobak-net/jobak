import "server-only";

import type { UserJSON } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { ValidationError } from "@/backend/shared/exceptions";

import type { ExternalIdentity } from "../../domain/entities/identity.entity";
import type { IdentityEvent } from "../../domain/entities/identity-event.entity";
import type { IdentityWebhook } from "../../domain/ports/identity-webhook.port";

/**
 * Clerk's webhooks, as `IdentityEvent`s.
 *
 * `verifyWebhook` reads `CLERK_WEBHOOK_SIGNING_SECRET` and checks the
 * signature over the raw body, so the delivery must reach here untouched (no
 * body parsing before it).
 *
 * Setup: Clerk Dashboard → Webhooks → add `/api/v1/webhooks/clerk`, subscribe
 * to `user.created`, `user.updated` and `user.deleted`, and set the endpoint's
 * signing secret as `CLERK_WEBHOOK_SIGNING_SECRET`.
 */
export class ClerkIdentityWebhook implements IdentityWebhook {
  async receive(delivery: Request): Promise<IdentityEvent> {
    let event;
    try {
      event = await verifyWebhook(delivery as Parameters<typeof verifyWebhook>[0]);
    } catch (error) {
      console.error("[auth/clerk-webhook] verification failed", error);
      throw new ValidationError("Webhook signature verification failed");
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        return { type: "upserted", identity: fromUserJSON(event.data) };
      case "user.deleted":
        return event.data.id ? { type: "deleted", externalId: event.data.id } : { type: "ignored", providerEvent: event.type };
      default:
        // Anything else subscribed is acknowledged and ignored.
        return { type: "ignored", providerEvent: event.type };
    }
  }
}

/** Clerk can hold several addresses; the primary one is the one we keep. */
function fromUserJSON(data: UserJSON): ExternalIdentity {
  const primary =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ?? data.email_addresses[0];

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();

  return {
    externalId: data.id,
    email: primary?.email_address ?? null,
    fullName: fullName || null,
  };
}
