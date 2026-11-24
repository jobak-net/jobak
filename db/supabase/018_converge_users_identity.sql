-- ============================================================
-- Jobak — converge `users` on the shape 017 defines
--
-- One database had a migration applied that never reached this repo,
-- `017_external_identity.sql`, from an earlier design in which `users` could
-- hold several providers side by side. It left:
--
--   users.external_provider            a column 017 does not have
--   users_external_identity_complete   CHECK: external_id needs a provider
--   users_external_identity_key        unique (external_provider, external_id)
--   external_id                        still NULLABLE — 017's
--                                      `ADD COLUMN IF NOT EXISTS … NOT NULL`
--                                      found the column already there and
--                                      skipped, NOT NULL included
--
-- The CHECK is the one that matters: the app writes `external_id` alone, so
-- with it in place every first-sight insert fails and nobody — not even the
-- local owner of a self-hosted instance — can be provisioned.
--
-- The provider is implied by the id itself (`user_…` is Clerk,
-- `local:owner` is the local owner), so the column carries nothing the app
-- needs. Removed rather than adopted, so that every database ends up with the
-- schema a fresh run of 000–017 produces.
--
-- Every statement is IF EXISTS / idempotent: on a database that never ran the
-- stray file, this whole migration is a no-op apart from re-asserting NOT NULL.
--
-- Not destructive: `users` holds no row without an `external_id` (017 emptied
-- the table, and nothing has been able to insert since). The DELETE below is a
-- guard for that assumption, not an expected operation.
--
-- No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_external_identity_complete;
DROP INDEX IF EXISTS users_external_identity_key;
ALTER TABLE users DROP COLUMN IF EXISTS external_provider;

-- Unreachable rows: no provider id means no request can ever resolve to them.
DELETE FROM users WHERE external_id IS NULL;
ALTER TABLE users ALTER COLUMN external_id SET NOT NULL;

-- The stray file's comment described the old design ("NULL for local password
-- and single-user accounts"), which is now wrong on both counts.
COMMENT ON COLUMN users.external_id IS
  'The identity provider''s id: a Clerk user_… id, or local:owner when AUTH_ENABLED=false. Unique; looked up on every request.';

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- Expect: external_id NOT NULL, no external_provider column:
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'users';
--
-- Expect only users_pkey and users_external_id_key:
--   SELECT indexname FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'users';
