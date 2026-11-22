import "server-only";

import { decryptSecret, encryptSecret } from "@/backend/shared/crypto";

import { createAiClient } from "./ai/ai-client.factory";
import {
  ConnectAiKeyUseCase,
  CreateAiClientForUserUseCase,
  GetAiSettingsUseCase,
  RemoveAiKeyUseCase,
  SetAiModelUseCase,
  SetPreferredAiProviderUseCase,
} from "./ai/application/ai-settings.use-cases";
import { PgAiSettingsRepository } from "./ai/infrastructure/pg-ai-settings.repository";

/**
 * The integrations module's composition root: the use cases that keep a
 * user's integration settings, and the one that turns them into a working AI
 * client. Cached per process, versioned so a running dev server rebuilds it
 * when its shape changes.
 */
export interface IntegrationsModule {
  ai: {
    /** Connected providers, the model per provider, and each default — `GET /api/v1/ai-settings`. */
    getSettings: GetAiSettingsUseCase;
    /** Picks one provider's model — `PUT /api/v1/ai-settings`. */
    setModel: SetAiModelUseCase;
    /** Checks a key with its provider, then stores it encrypted — `PUT /api/v1/ai-settings/key`. */
    connectKey: ConnectAiKeyUseCase;
    /** Forgets a provider's key — `DELETE /api/v1/ai-settings/key/[provider]`. */
    removeKey: RemoveAiKeyUseCase;
    /** Which saved key the AI tools use — `PUT /api/v1/ai-settings/preferred`. */
    setPreferred: SetPreferredAiProviderUseCase;
    /**
     * What an AI feature calls: the user's preferred provider, its key
     * decrypted, their model — as a ready `AiClient`. `ai-not-connected` without one.
     */
    clientForUser: CreateAiClientForUserUseCase;
  };
}

const VERSION = 3;

const globalForIntegrations = globalThis as unknown as {
  integrationsModule?: IntegrationsModule;
  integrationsModuleVersion?: number;
};

export function getIntegrationsModule(): IntegrationsModule {
  if (!globalForIntegrations.integrationsModule || globalForIntegrations.integrationsModuleVersion !== VERSION) {
    const settings = new PgAiSettingsRepository();
    globalForIntegrations.integrationsModule = {
      ai: {
        getSettings: new GetAiSettingsUseCase(settings),
        setModel: new SetAiModelUseCase(settings),
        connectKey: new ConnectAiKeyUseCase(settings, createAiClient, encryptSecret),
        removeKey: new RemoveAiKeyUseCase(settings),
        setPreferred: new SetPreferredAiProviderUseCase(settings),
        clientForUser: new CreateAiClientForUserUseCase(settings, createAiClient, decryptSecret),
      },
    };
    globalForIntegrations.integrationsModuleVersion = VERSION;
  }
  return globalForIntegrations.integrationsModule;
}
