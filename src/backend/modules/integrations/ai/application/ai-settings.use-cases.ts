import { AiNotConnectedError, NotFoundError } from "@/backend/shared/exceptions";
import type {
  AiSettingsResponse,
  ConnectAiKeyRequest,
  SetPreferredAiProviderRequest,
  UpdateAiModelRequest,
} from "@/shared/contracts/ai-settings";
import { AI_PROVIDER_IDS, isAiModelFor } from "@/shared/ai";

import { resolveModel } from "../config";
import type { AiClient, AiClientOptions, AiProviderId } from "../domain/ai-client";
import type { AiModelChoices, AiSettingsRepository, StoredAiSettings } from "../domain/ai-settings.repository";

const NO_PREFERENCES = "No preferences to store it on: finish onboarding first";

/**
 * What Settings shows: which providers are connected (preferred first), the
 * stored model picks that are still on the list, and this server's default
 * for each provider (`AI_MODEL_<PROVIDER>`, else the shared default) — so
 * "Default" names the model that will really run.
 */
function toResponse(stored: StoredAiSettings): AiSettingsResponse {
  // `providers` gives the order; a key without an entry there (written by
  // something older) still counts, after the ordered ones.
  const connected = [
    ...stored.providers.filter((provider) => stored.keyed.includes(provider)),
    ...stored.keyed.filter((provider) => !stored.providers.includes(provider)),
  ];

  const models: AiModelChoices = {};
  for (const provider of AI_PROVIDER_IDS) {
    const model = stored.models[provider];
    if (model && isAiModelFor(provider, model)) models[provider] = model;
  }

  const defaults = Object.fromEntries(
    AI_PROVIDER_IDS.map((provider) => [provider, resolveModel(provider, null)]),
  ) as Record<AiProviderId, string>;

  return { connected, preferred: connected[0] ?? null, models, defaults };
}

/** `GET /api/v1/ai-settings`. Also how an AI tool learns the user's provider and model. */
export class GetAiSettingsUseCase {
  constructor(private readonly settings: AiSettingsRepository) {}

  async execute(userId: string): Promise<AiSettingsResponse> {
    return toResponse(await this.settings.find(userId));
  }
}

/**
 * `PUT /api/v1/ai-settings`: one provider's model, or back to its default.
 * The body is already checked (`aiModelSchema`): a known provider, and a
 * model on its list.
 */
export class SetAiModelUseCase {
  constructor(private readonly settings: AiSettingsRepository) {}

  async execute(userId: string, { provider, model }: UpdateAiModelRequest): Promise<AiSettingsResponse> {
    if (!(await this.settings.setModel(userId, provider, model))) throw new NotFoundError(NO_PREFERENCES);
    return toResponse(await this.settings.find(userId));
  }
}

/**
 * `PUT /api/v1/ai-settings/key`: connects a provider.
 *
 *   1. the body is already checked (`aiKeySchema`): a known provider, and a
 *      value shaped like its keys;
 *   2. the provider is asked whether the key works (`AiClient.verifyKey`: its
 *      model list, which costs the user nothing). A refusal throws
 *      `AiKeyRejectedError` and nothing is stored;
 *   3. the key is encrypted and stored, and its provider becomes the preferred
 *      one — replacing any earlier key for the same provider. A `model` in the
 *      body is stored in the same write, so Settings saves its whole form at
 *      once: never a key without its model, or a model without its key.
 *
 * The key is never logged and never returned.
 */
export class ConnectAiKeyUseCase {
  constructor(
    private readonly settings: AiSettingsRepository,
    private readonly createClient: (options: AiClientOptions) => Promise<AiClient>,
    private readonly encrypt: (plaintext: string) => Promise<string>,
  ) {}

  async execute(userId: string, { provider, key, model }: ConnectAiKeyRequest): Promise<AiSettingsResponse> {
    const apiKey = key.trim();

    const client = await this.createClient({ provider, apiKey, rateLimitKey: userId });
    await client.verifyKey();

    if (!(await this.settings.saveKey(userId, provider, await this.encrypt(apiKey), model))) {
      throw new NotFoundError(NO_PREFERENCES);
    }
    return toResponse(await this.settings.find(userId));
  }
}

/**
 * `DELETE /api/v1/ai-settings/key/[provider]`: forgets a key.
 *
 * The next connected provider, if any, becomes preferred, so the AI tools keep
 * running on it. With none left, every AI feature answers `ai-not-connected`
 * until a key is added again — Settings warns before it sends this. Removing
 * a key that isn't there answers the same as removing one that is: either
 * way, there is no key now.
 */
export class RemoveAiKeyUseCase {
  constructor(private readonly settings: AiSettingsRepository) {}

  async execute(userId: string, provider: AiProviderId): Promise<AiSettingsResponse> {
    await this.settings.removeKey(userId, provider);
    return toResponse(await this.settings.find(userId));
  }
}

/**
 * `PUT /api/v1/ai-settings/preferred`: which saved key the AI tools use.
 * Only a provider with a saved key can be picked; to use another, connect its
 * key (which also makes it preferred).
 */
export class SetPreferredAiProviderUseCase {
  constructor(private readonly settings: AiSettingsRepository) {}

  async execute(userId: string, { provider }: SetPreferredAiProviderRequest): Promise<AiSettingsResponse> {
    const stored = await this.settings.find(userId);
    if (!stored.keyed.includes(provider)) throw new AiNotConnectedError(`No saved key for ${provider}`);
    await this.settings.setPreferred(userId, provider);
    return toResponse(await this.settings.find(userId));
  }
}

/**
 * The AI client an AI feature runs on, for one user — the only place a stored
 * key is decrypted.
 *
 *   const ai = await getIntegrationsModule().ai.clientForUser.execute(user.id);
 *   const { text } = await ai.complete({ system, messages });
 *
 * Picks the preferred provider (or `provider`, when a feature needs a specific
 * one and the user has its key), decrypts its key, and builds the client with
 * the user's model for it. The caller never sees the key, the provider or the
 * model, unless it reads them off the client for logs.
 *
 * Throws `AiNotConnectedError` (409) when there is no usable key: none saved,
 * not that provider's, or one that can't be decrypted any more (`ENCRYPTION_SECRET`
 * changed). That last case is logged — it's ours to notice — and the user's fix
 * is the same: add the key again.
 */
export class CreateAiClientForUserUseCase {
  constructor(
    private readonly settings: AiSettingsRepository,
    private readonly createClient: (options: AiClientOptions) => Promise<AiClient>,
    private readonly decrypt: (stored: string) => Promise<string>,
  ) {}

  async execute(userId: string, { provider }: { provider?: AiProviderId } = {}): Promise<AiClient> {
    const current = toResponse(await this.settings.find(userId));
    const chosen = provider ?? current.preferred;
    if (!chosen || !current.connected.includes(chosen)) {
      throw new AiNotConnectedError(chosen ? `No saved key for ${chosen}` : "No AI provider connected");
    }

    const stored = await this.settings.findKey(userId, chosen);
    if (!stored) throw new AiNotConnectedError(`No saved key for ${chosen}`);

    let apiKey: string;
    try {
      apiKey = await this.decrypt(stored);
    } catch (error) {
      // Never the value: only which provider, and why.
      console.error(`[ai] the stored ${chosen} key couldn't be decrypted (was ENCRYPTION_SECRET changed?)`, (error as Error).message);
      throw new AiNotConnectedError(`The stored ${chosen} key can't be read`);
    }

    return this.createClient({ provider: chosen, apiKey, model: current.models[chosen] ?? null, rateLimitKey: userId });
  }
}
