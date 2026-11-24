import "server-only";

import { auth, clerkClient, type User as ClerkUser } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

import type { ExternalIdentity } from "../../domain/entities/identity.entity";
import type { IdentityProvider } from "../../domain/ports/identity-provider.port";

/**
 * Identity from Clerk.
 *
 * `auth()` reads and verifies the session token on the request — no network —
 * so `currentExternalId` is cheap enough to call on every render. It depends on
 * `clerkMiddleware()` having run for the request, which is why the proxy
 * matcher covers API routes as well as pages.
 */
export class ClerkIdentityProvider implements IdentityProvider {
  readonly kind = "clerk";

  async currentExternalId(): Promise<string | null> {
    const { isAuthenticated, userId } = await auth();
    return isAuthenticated ? userId : null;
  }

  async loadIdentity(externalId: string): Promise<ExternalIdentity | null> {
    try {
      const client = await clerkClient();
      return fromClerkUser(await client.users.getUser(externalId));
    } catch (error) {
      // A 404 is "deleted upstream"; anything else is a real failure.
      if (isClerkAPIResponseError(error) && error.status === 404) return null;
      throw error;
    }
  }
}

export function fromClerkUser(user: ClerkUser): ExternalIdentity {
  return {
    externalId: user.id,
    // The primary address when one is set, else any — Clerk allows several.
    email:
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null,
    fullName: user.fullName,
  };
}
