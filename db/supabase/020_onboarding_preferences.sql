-- ============================================================
-- Jobak — onboarding flag and search-preference rules
--
-- Onboarding asks for the preferences that drive the job search, and the
-- dashboard shows it to anyone who has not finished it. Both already have
-- columns in `user_preferences`; this migration makes them dependable rather
-- than adding duplicates.
--
-- ── The onboarding flag ─────────────────────────────────────
-- `onboarding_completed` has existed since 001 but was nullable, so a row could
-- say neither yes nor no. It becomes NOT NULL DEFAULT false. A user with no
-- row at all has not onboarded either — the app reads a missing row as false.
--
-- ── The search rules, enforced here as well as in the app ───
--   1. "Anywhere in the world" means remote jobs only. Jobak targets MENA:
--      a user who is not tied to a MENA country can only take work they can
--      do from wherever they are. So `worldwide = true` requires
--      `work_preference = {remote}` and an empty country list.
--   2. `location` has one shape: { "worldwide": bool, "countries": [codes] }.
--
-- The app normalises input before saving (see modules/preferences), so these
-- checks never fire in normal use. They exist so that no code path — a script,
-- a future endpoint, a hand-written UPDATE — can store a contradiction the job
-- search would then have to guess its way around.
--
-- Country codes are validated against the MENA list in the app rather than
-- here: a CHECK cannot read the `regions` table, and a trigger for it would be
-- more machinery than the rule is worth.
--
-- No rows exist yet (verified before writing), so the constraints apply
-- cleanly. No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

-- ── 1. The flag ─────────────────────────────────────────────
UPDATE user_preferences SET onboarding_completed = false WHERE onboarding_completed IS NULL;
ALTER TABLE user_preferences ALTER COLUMN onboarding_completed SET DEFAULT false;
ALTER TABLE user_preferences ALTER COLUMN onboarding_completed SET NOT NULL;

-- ── 2. Location shape ───────────────────────────────────────
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_location_shape;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_location_shape CHECK (
  location IS NULL
  OR (
    jsonb_typeof(location) = 'object'
    AND jsonb_typeof(location -> 'worldwide') = 'boolean'
    AND jsonb_typeof(location -> 'countries') = 'array'
  )
);

-- ── 3. Worldwide means remote only ──────────────────────────
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_worldwide_is_remote;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_worldwide_is_remote CHECK (
  location IS NULL
  OR (location ->> 'worldwide')::boolean IS NOT TRUE
  OR (
    work_preference = ARRAY['remote']::text[]
    AND jsonb_array_length(location -> 'countries') = 0
  )
);

-- ── 4. Say what the columns now mean ────────────────────────
COMMENT ON COLUMN user_preferences.onboarding_completed IS
  'True once the user finished onboarding. The dashboard shows onboarding until it is.';
COMMENT ON COLUMN user_preferences.location IS
  '{ "worldwide": bool, "countries": [ISO alpha-2 MENA codes] }. Worldwide implies remote-only and no countries.';
COMMENT ON COLUMN user_preferences.skills IS
  'Search keywords: skills, tools or domains to match in job postings, alongside job_titles.';

-- ── Verify ───────────────────────────────────────────────────
-- The flag is never null:
--   SELECT is_nullable FROM information_schema.columns
--   WHERE table_name = 'user_preferences' AND column_name = 'onboarding_completed';   -- NO
--
-- A worldwide, non-remote row is rejected:
--   INSERT INTO user_preferences (user_id, location, work_preference)
--   VALUES ('<a user id>', '{"worldwide": true, "countries": []}', ARRAY['hybrid']);  -- must fail
