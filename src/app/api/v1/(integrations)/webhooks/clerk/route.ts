import { getAuthModule } from "@/backend/modules/auth/composition";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";
import { NotFoundError } from "@/backend/shared/exceptions";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";

/**
 * POST /api/v1/webhooks/clerk
 *
 * Clerk's deliveries ("this person changed / was deleted"), handed to the auth
 * module: `syncUser` verifies the signature (`ClerkIdentityWebhook`) and
 * applies the change to `users` (`SyncUserUseCase`). This file only routes the
 * URL there — Next needs it under `src/app/api/`, the work lives in auth.
 *
 * No session check and no body schema: deliveries carry no user session, and
 * the signature is checked over the raw body. A bad signature is a 400; a
 * failed write is a 5xx, which Clerk retries.
 */
export const dynamic = "force-dynamic";

export const POST = withMiddlewares({ label: "webhooks.clerk" }, async ({ request }) => {
  // No Clerk on this instance, so nothing legitimate can be calling.
  if (!isAuthEnabled()) throw new NotFoundError("Auth is disabled on this instance");

  const applied = await getAuthModule().syncUser.execute(request);
  return { ok: true, applied };
});
