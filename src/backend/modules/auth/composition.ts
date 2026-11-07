import "server-only";

import { GetCurrentUserUseCase, SyncUserUseCase } from "./application/use-cases";
import type { IdentityProvider } from "./domain/ports/identity-provider.port";
import {
  getClerkKeys,
  isAuthEnabled,
  warnIfAuthDisabled,
} from "./infrastructure/config";
import {
  ClerkIdentityProvider,
  LocalIdentityProvider,
} from "./infrastructure/providers";
import { PgUserRepository } from "./infrastructure/repositories/user.repository";

/**
 * The composition root: the one place that decides which implementations the
 * use cases get.
 *
 * This is where `AUTH_ENABLED` turns into behaviour. Everything downstream —
 * the DAL, every server action that scopes by `user.id` — receives the same
 * use cases in both modes and never asks which one it is in.
 *
 * Route handlers and the DAL import the assembled module from here and nothing
 * else.
 */

/**
 * Built once per process and cached on `globalThis`: Next's dev server
 * re-evaluates modules on every hot reload, and the objects are stateless —
 * they hold ports, not connections — so sharing them across requests is safe.
 *
 * The mode is read once here too, which is fine: environment variables do not
 * change under a running process.
 */
const globalForAuth = globalThis as unknown as { authModule?: AuthModule };

export interface AuthModule {
  getCurrentUser: GetCurrentUserUseCase;
  syncUser: SyncUserUseCase;
  /** Exposed so the DAL can pick how to send a signed-out visitor to sign in. */
  identity: IdentityProvider;
}

function createIdentityProvider(): IdentityProvider {
  if (!isAuthEnabled()) {
    warnIfAuthDisabled();
    return new LocalIdentityProvider();
  }

  // Throws with the missing variable's name — better here, at first use, than
  // as an opaque failure inside Clerk's SDK.
  getClerkKeys();
  return new ClerkIdentityProvider();
}

function build(): AuthModule {
  const users = new PgUserRepository();
  const identity = createIdentityProvider();

  return {
    getCurrentUser: new GetCurrentUserUseCase(identity, users),
    syncUser: new SyncUserUseCase(users),
    identity,
  };
}

export function getAuthModule(): AuthModule {
  if (!globalForAuth.authModule) {
    globalForAuth.authModule = build();
  }
  return globalForAuth.authModule;
}
