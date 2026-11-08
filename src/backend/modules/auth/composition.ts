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
 * Cached on `globalThis`: Next's dev server re-evaluates modules on every hot
 * reload, and the objects are stateless — they hold ports, not connections —
 * so sharing them across requests is safe.
 *
 * ── Keyed by mode ───────────────────────────────────────────
 * The cache remembers which mode it was built for and is rebuilt when
 * `AUTH_ENABLED` changes. `next dev` reloads `.env` files in the same process
 * when they are edited, so the environment *can* change under a running server,
 * and the cache outlives that. A Clerk-mode module surviving a switch to
 * `AUTH_ENABLED=false` sent signed-out requests to /login, whose layout reads
 * the env afresh and sent them straight back: an endless redirect loop.
 */
const globalForAuth = globalThis as unknown as {
  authModule?: { authEnabled: boolean; module: AuthModule };
};

export interface AuthModule {
  getCurrentUser: GetCurrentUserUseCase;
  syncUser: SyncUserUseCase;
  /** Exposed so the DAL can pick how to send a signed-out visitor to sign in. */
  identity: IdentityProvider;
}

function createIdentityProvider(authEnabled: boolean): IdentityProvider {
  if (!authEnabled) {
    warnIfAuthDisabled();
    return new LocalIdentityProvider();
  }

  // Throws with the missing variable's name — better here, at first use, than
  // as an opaque failure inside Clerk's SDK.
  getClerkKeys();
  return new ClerkIdentityProvider();
}

function build(authEnabled: boolean): AuthModule {
  const users = new PgUserRepository();
  const identity = createIdentityProvider(authEnabled);

  return {
    getCurrentUser: new GetCurrentUserUseCase(identity, users),
    syncUser: new SyncUserUseCase(users),
    identity,
  };
}

export function getAuthModule(): AuthModule {
  // Read on every call: it is a string comparison, and it is what keeps this
  // module agreeing with the proxy and the auth layout, which also read it fresh.
  const authEnabled = isAuthEnabled();
  const cached = globalForAuth.authModule;

  if (!cached || cached.authEnabled !== authEnabled) {
    globalForAuth.authModule = { authEnabled, module: build(authEnabled) };
  }
  return globalForAuth.authModule!.module;
}
