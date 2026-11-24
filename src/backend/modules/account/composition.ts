import "server-only";

import { getAuthModule } from "@/backend/modules/auth/composition";
import { getPreferencesModule } from "@/backend/modules/preferences";

import { GetAccountStatusUseCase } from "./application/get-account-status.use-case";
import type { AccountSources } from "./domain/ports";

/**
 * The account module's composition root. Answers its ports from the auth and
 * preferences modules.
 *
 * The sources ask for those modules on every call rather than holding them:
 * the auth module is rebuilt when `AUTH_ENABLED` changes under a running dev
 * server, and a captured copy would keep answering for the old mode.
 */
export interface AccountModule {
  status: GetAccountStatusUseCase;
}

const sources: AccountSources = {
  currentUser: () => getAuthModule().getCurrentUser.execute(),
  hasCompletedOnboarding: (userId) => getPreferencesModule().onboardingStatus.execute(userId),
};

const globalForAccount = globalThis as unknown as { accountModule?: AccountModule };

export function getAccountModule(): AccountModule {
  if (!globalForAccount.accountModule) {
    globalForAccount.accountModule = { status: new GetAccountStatusUseCase(sources) };
  }
  return globalForAccount.accountModule;
}
