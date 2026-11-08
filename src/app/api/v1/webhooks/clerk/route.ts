import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON } from "@clerk/nextjs/server";

import { getAuthModule } from "@/backend/modules/auth/composition";
import type { ExternalIdentity } from "@/backend/modules/auth/domain/entities";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";

/**
 * POST /api/v1/webhooks/clerk
 *
 * Keeps `users` in step with Clerk: profile changes and deletions.
 *
 * Creation does not depend on this — the DAL provisions a row the first time
 * someone makes a request — so a late or failed `user.created` costs nothing.
 * What does depend on it is deletion: without `user.deleted` a removed account's
 * preferences, matches and saved keys would outlive it.
 *
 * ── Setup ───────────────────────────────────────────────────
 * Clerk Dashboard → Webhooks → add this URL, subscribe to `user.created`,
 * `user.updated` and `user.deleted`, and set the endpoint's signing secret as
 * `CLERK_WEBHOOK_SIGNING_SECRET`.
 *
 * No session check, and there must never be one: deliveries carry no user
 * session, and the signature is what proves they came from Clerk.
 */
export const dynamic = "force-dynamic";

/** Clerk can hold several addresses; the primary one is the one we keep. */
function fromUserJSON(data: UserJSON): ExternalIdentity {
  const primary =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  const fullName = [data.first_name, data.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    externalId: data.id,
    email: primary?.email_address ?? null,
    fullName: fullName || null,
  };
}

export async function POST(request: NextRequest) {
  // No Clerk on this instance, so nothing legitimate can be calling.
  if (!isAuthEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  let event;
  try {
    // Reads CLERK_WEBHOOK_SIGNING_SECRET and throws on a bad signature.
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("[webhooks/clerk] verification failed", error);
    return new Response("Verification failed", { status: 400 });
  }

  const { syncUser } = getAuthModule();

  /*
   * A thrown error becomes a 500, which Clerk retries on its schedule — the
   * right outcome for a database blip. Both operations are idempotent, so a
   * retry that lands after a success changes nothing.
   */
  try {
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await syncUser.upsert(fromUserJSON(event.data));
        break;

      case "user.deleted":
        if (event.data.id) await syncUser.remove(event.data.id);
        break;

      // Anything else subscribed is acknowledged and ignored.
    }
  } catch (error) {
    console.error(`[webhooks/clerk] ${event.type} failed`, error);
    return new Response("Sync failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
