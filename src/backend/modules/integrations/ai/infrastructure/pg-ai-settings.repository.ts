import "server-only";

import { query, queryOne } from "@/backend/shared/database";
import { isAiProviderId } from "@/shared/ai";

import type { AiProviderId } from "../domain/ai-client";
import type { AiModelChoices, AiSettingsRepository, StoredAiSettings } from "../domain/ai-settings.repository";

interface SettingsRow {
  ai_providers: string[] | null;
  keyed: string[] | null;
  ai_models: AiModelChoices | null;
}

/**
 * The AI columns of `user_preferences`, over the app's Postgres connection:
 *
 *  - `ai_providers` (001): the connected providers, most recent first;
 *  - `ai_keys_encrypted` (001): `{ provider: "iv:ciphertext" }`. `find` only
 *    says which providers have a value; `findKey` returns one, still
 *    encrypted, for the AI client to decrypt;
 *  - `groq_api_key_encrypted` (001): the single-provider column from before.
 *    001 says it's "still written and still read as a fallback", so a Groq
 *    key is written to both, read from either, and removed from both;
 *  - `ai_models` (024): `{ provider: modelId }`.
 *
 * JSONB values are changed one key at a time, so two tabs saving different
 * providers don't overwrite each other. Always an UPDATE, never an insert:
 * the row is created by finishing onboarding, and creating it here would make
 * `GET /api/v1/preferences` report saved (empty) preferences for someone who
 * never answered.
 */
export class PgAiSettingsRepository implements AiSettingsRepository {
  async find(userId: string): Promise<StoredAiSettings> {
    const row = await queryOne<SettingsRow>(
      `SELECT ai_providers,
              ARRAY(
                SELECT jsonb_object_keys(COALESCE(ai_keys_encrypted, '{}'::jsonb))
                UNION
                SELECT 'groq' WHERE groq_api_key_encrypted IS NOT NULL
              ) AS keyed,
              ai_models
         FROM user_preferences
        WHERE user_id = $1`,
      [userId],
    );
    return {
      providers: (row?.ai_providers ?? []).filter(isAiProviderId),
      keyed: (row?.keyed ?? []).filter(isAiProviderId),
      models: row?.ai_models ?? {},
    };
  }

  async setModel(userId: string, provider: AiProviderId, model: string | null): Promise<boolean> {
    const rows =
      model === null
        ? await query(
            `UPDATE user_preferences SET ai_models = ai_models - $2::text
              WHERE user_id = $1
             RETURNING 1`,
            [userId, provider],
          )
        : await query(
            `UPDATE user_preferences SET ai_models = ai_models || jsonb_build_object($2::text, $3::text)
              WHERE user_id = $1
             RETURNING 1`,
            [userId, provider, model],
          );
    return rows.length > 0;
  }

  async saveKey(
    userId: string,
    provider: AiProviderId,
    encryptedKey: string,
    model?: string | null,
  ): Promise<boolean> {
    // $4: whether to touch the model at all; $5: the model, or null for the default.
    const rows = await query(
      `UPDATE user_preferences
          SET ai_keys_encrypted      = COALESCE(ai_keys_encrypted, '{}'::jsonb) || jsonb_build_object($2::text, $3::text),
              ai_providers           = array_prepend($2::text, array_remove(COALESCE(ai_providers, '{}'), $2::text)),
              groq_api_key_encrypted = CASE WHEN $2::text = 'groq' THEN $3::text ELSE groq_api_key_encrypted END,
              ai_models              = CASE
                                         WHEN NOT $4::boolean THEN ai_models
                                         WHEN $5::text IS NULL THEN ai_models - $2::text
                                         ELSE ai_models || jsonb_build_object($2::text, $5::text)
                                       END
        WHERE user_id = $1
       RETURNING 1`,
      [userId, provider, encryptedKey, model !== undefined, model ?? null],
    );
    return rows.length > 0;
  }

  async removeKey(userId: string, provider: AiProviderId): Promise<void> {
    await query(
      `UPDATE user_preferences
          SET ai_keys_encrypted      = COALESCE(ai_keys_encrypted, '{}'::jsonb) - $2::text,
              ai_providers           = array_remove(COALESCE(ai_providers, '{}'), $2::text),
              groq_api_key_encrypted = CASE WHEN $2::text = 'groq' THEN NULL ELSE groq_api_key_encrypted END
        WHERE user_id = $1`,
      [userId, provider],
    );
  }

  async setPreferred(userId: string, provider: AiProviderId): Promise<void> {
    await query(
      `UPDATE user_preferences
          SET ai_providers = array_prepend($2::text, array_remove(COALESCE(ai_providers, '{}'), $2::text))
        WHERE user_id = $1`,
      [userId, provider],
    );
  }

  async findKey(userId: string, provider: AiProviderId): Promise<string | null> {
    const row = await queryOne<{ encrypted: string | null }>(
      `SELECT COALESCE(
                ai_keys_encrypted ->> $2::text,
                CASE WHEN $2::text = 'groq' THEN groq_api_key_encrypted END
              ) AS encrypted
         FROM user_preferences
        WHERE user_id = $1`,
      [userId, provider],
    );
    return row?.encrypted ?? null;
  }
}
