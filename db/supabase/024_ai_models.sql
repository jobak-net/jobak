-- ============================================================
-- Jobak — the AI model each user picked, per provider
--
-- Users choose which model runs their AI tools in Settings, from a curated
-- list per provider (`AI_MODELS`, src/shared/ai/models.ts). The choice is kept
-- per provider, `{ "groq": "llama-3.1-8b-instant", "openai": "gpt-4.1" }`, so
-- switching provider and back keeps what they had picked for each.
--
-- A provider with no entry runs its default; "back to the default" removes
-- the entry rather than storing the default's id, so a later change of
-- default reaches everyone who never chose.
--
-- The model ids themselves are NOT checked here: the list changes with the
-- providers' catalogues, and a migration per retired model would be churn.
-- The API refuses an id that isn't on the list, and the AI client falls back
-- to the default for a stored one that has since been taken off it. What is
-- checked is the shape: an object, keyed by provider id (the same set as
-- `ai_providers`, 001), with a string for each.
--
-- No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ai_models JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_ai_models_shape;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_ai_models_shape CHECK (
  (jsonb_typeof(ai_models) = 'object') IS TRUE
  -- Removing the known provider keys leaves nothing: no other keys.
  AND (ai_models - ARRAY['anthropic', 'openai', 'gemini', 'groq']) = '{}'::jsonb
  -- Every value is a model id.
  AND NOT jsonb_path_exists(ai_models, '$.* ? (@.type() != "string")')
);

COMMENT ON COLUMN user_preferences.ai_models IS
  'The model picked per AI provider, { provider: modelId }; no entry = the provider''s default. Ids are checked by the API against AI_MODELS (src/shared/ai/models.ts).';
