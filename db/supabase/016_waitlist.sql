-- ============================================================
-- Jobak — waitlist
--
-- The product launches as a waitlist: the dashboard is not ready for strangers,
-- so the site collects interest instead of accounts. This is where that
-- interest lands.
--
-- Deliberately NOT the `users` table. A waitlist signup is not an account: no
-- password, no session, no verification, and nothing here should ever satisfy a
-- login. Keeping them apart means the auth module's guarantees stay true —
-- every row in `users` is someone who chose a password and confirmed an address.
-- ============================================================
--
-- No BEGIN/COMMIT: the runner in scripts/db/migration.ts wraps each migration
-- in a transaction already.

CREATE TABLE IF NOT EXISTS waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- CITEXT and UNIQUE for the same reason as `users.email`: the database
  -- decides that "Sam@x.com" and "sam@x.com" are one person, so no call site
  -- has to remember to normalise.
  email         CITEXT NOT NULL UNIQUE,

  /*
   * What they are looking for. All optional — the form asks, but a signup with
   * only an address is still a signup, and demanding more would cost sign-ups
   * for data nobody is acting on yet.
   *
   * Arrays rather than single values because the same answers are multi-select
   * in onboarding, and matching those shapes now means the data is usable when
   * these people are invited in.
   */
  field         TEXT,
  job_titles    TEXT[] DEFAULT '{}',
  countries     TEXT[] DEFAULT '{}',   -- ISO-3166-1 alpha-2
  work_preference TEXT[] DEFAULT '{}'
                  CHECK (work_preference <@ ARRAY['remote', 'on-site', 'hybrid']),

  /*
   * Where they came from, for judging which channel actually worked. `source`
   * is ours (a ?ref= on the link); `referrer` is the browser's, which is often
   * absent and never trustworthy — both are diagnostics, not identity.
   */
  source        TEXT,
  referrer      TEXT,

  -- Set when they are actually let in, so the list can be worked through in
  -- order and "who is still waiting" has an answer.
  invited_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The list is worked in signup order, so this is the index that matters.
CREATE INDEX IF NOT EXISTS idx_waitlist_created
  ON waitlist(created_at);

-- "Who has not been invited yet" — the query the launch actually runs.
CREATE INDEX IF NOT EXISTS idx_waitlist_pending
  ON waitlist(created_at) WHERE invited_at IS NULL;

/*
 * Unreachable from the browser, like the auth tables. RLS with no policy denies
 * everything to anon/authenticated, and the REVOKE closes the PostgREST path —
 * the only way in is the app's own connection, or n8n over Postgres.
 *
 * This matters more than for most tables: a readable waitlist is a list of
 * people's email addresses.
 */
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON waitlist FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Reading it ───────────────────────────────────────────────
-- How many are waiting:
--   SELECT count(*) FROM waitlist WHERE invited_at IS NULL;
--
-- The next fifty to invite:
--   SELECT email, field, countries FROM waitlist
--   WHERE invited_at IS NULL ORDER BY created_at LIMIT 50;
--
-- What people are asking for, which is the point of collecting it:
--   SELECT field, count(*) FROM waitlist GROUP BY field ORDER BY 2 DESC;
--   SELECT unnest(countries) AS country, count(*) FROM waitlist
--   GROUP BY 1 ORDER BY 2 DESC;
