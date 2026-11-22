import type { AiProviderId } from "./ai-client";

/** The model picked per provider, as stored: a provider with no entry runs its default. */
export type AiModelChoices = Partial<Record<AiProviderId, string>>;

/** A user's AI settings, as stored — never the keys themselves. */
export interface StoredAiSettings {
  /** `ai_providers`: the providers in the order the user connected them, most recent first. */
  providers: AiProviderId[];
  /** The providers that have a stored key. */
  keyed: AiProviderId[];
  /** `ai_models`, unchecked against the list. */
  models: AiModelChoices;
}

/** Where a user's AI settings are kept. A port, so the use cases never name the table. */
export interface AiSettingsRepository {
  /** Empty settings when the user has none (or no preferences row yet). */
  find(userId: string): Promise<StoredAiSettings>;

  /**
   * Stores `model` for `provider`, or removes the entry when `model` is null.
   * False when the user has no preferences row to store it on (onboarding not
   * finished).
   */
  setModel(userId: string, provider: AiProviderId, model: string | null): Promise<boolean>;

  /**
   * Stores `provider`'s key, already encrypted, and makes it the preferred
   * provider (first in `providers`) — and, in the same write, its model when
   * `model` is given (null = back to the default; undefined = unchanged).
   * False when there is no preferences row.
   */
  saveKey(userId: string, provider: AiProviderId, encryptedKey: string, model?: string | null): Promise<boolean>;

  /**
   * Deletes `provider`'s key and takes it out of `providers`, so the next one
   * becomes preferred. The model pick is kept, for if they connect it again.
   * Removing a key that isn't there is not an error.
   */
  removeKey(userId: string, provider: AiProviderId): Promise<void>;

  /** Moves `provider` to the front of `providers`. The caller has checked it has a key. */
  setPreferred(userId: string, provider: AiProviderId): Promise<void>;

  /**
   * `provider`'s stored key, still encrypted — for the one path that decrypts
   * it (`CreateAiClientForUserUseCase`). Null when there is none.
   */
  findKey(userId: string, provider: AiProviderId): Promise<string | null>;
}
