-- ============================================================
-- Jobak — hand identity to Clerk
--
-- Sign-in, sessions, passwords and email verification move to Clerk (or, on a
-- self-hosted instance with AUTH_ENABLED=false, to a single local owner with no
-- sign-in at all). What stays in this database is the `users` row every other
-- table points at.
--
-- ── Why `users` survives ────────────────────────────────────
-- `users.id` is the foreign key on user_preferences, user_job_matches,
-- search_requests, user_marketing, user_profiles and feedback. Clerk's ids are
-- strings (`user_2ab…`), not UUIDs, so rather than retyping six FKs the row
-- keeps our UUID and gains `external_id` — the provider's id, looked up on
-- every request and provisioned on first sight.
--
-- ── What goes ───────────────────────────────────────────────
--   sessions, auth_tokens       Clerk issues and revokes sessions, and sends
--                               verification and reset mail itself.
--   users.password_hash         No passwords are held here any more.
--   users.email_verified_at     Verification is Clerk's to track.
--   UNIQUE / NOT NULL on email  Uniqueness of an address is now Clerk's rule,
--                               and our column is a copy. Kept unique, a user
--                               deleted in Clerk whose `user.deleted` webhook
--                               never landed could not sign up again with the
--                               same address. Nullable because Clerk can run
--                               phone- or username-only sign-in.
--
-- ── DESTRUCTIVE ─────────────────────────────────────────────
-- Every existing `users` row is deleted. They were created by the custom auth
-- that this replaces, hold password hashes that are being dropped, and have no
-- Clerk id to be matched to — confirmed as dev-only data before writing.
--
-- The delete cascades: every user_preferences, user_job_matches,
-- search_requests, user_marketing and user_profiles row goes with it, and
-- feedback rows survive with `user_id` set to NULL.
--
-- No BEGIN/COMMIT in this file: the runner in scripts/db/migration.ts already
-- wraps each migration in a transaction and records it in `_migrations` inside
-- that same transaction.
-- ============================================================

-- ── Sessions and one-time tokens ────────────────────────────
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS sessions;

-- ── Existing accounts ───────────────────────────────────────
DELETE FROM users;

-- ── users: credentials out, external id in ──────────────────
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;

/*
 * NOT NULL straight away: the table was just emptied, so there is nothing to
 * backfill, and a user row without a provider id could never be found again.
 */
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id TEXT NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_external_id_key UNIQUE (external_id);

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

/*
 * The unique constraint on email came from an inline `UNIQUE` in 014, so its
 * name is whatever Postgres generated — `users_email_key` by convention, but not
 * guaranteed. A `DROP CONSTRAINT IF EXISTS` on a guessed name would fail
 * silently and leave it in place, so find it in the catalogue instead.
 */
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute  a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.users'::regclass
      AND c.contype  = 'u'
      AND a.attname  = 'email'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'dropped unique constraint % on users.email', r.conname;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- The identity tables are gone — expect zero rows:
--   SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN ('sessions', 'auth_tokens');
--
-- users has exactly these columns:
--   id, email, full_name, created_at, updated_at, external_id
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'users';
--
-- The only unique constraints left on users are the primary key and
-- users_external_id_key:
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'public.users'::regclass;
