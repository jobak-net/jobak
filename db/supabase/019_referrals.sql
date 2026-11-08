-- ============================================================
-- Jobak — referrals
--
-- Who invited whom. A signed-in user shares `/register?ref=<code>`; when the
-- person who opened it creates an account, one row lands here linking the two.
--
-- ── The code ────────────────────────────────────────────────
-- A user's referral code is the first 10 hex characters of their own id. It is
-- derived rather than chosen, so every user has one from the moment their row
-- exists, and links shared before this migration keep working. A generated
-- column makes it indexable, so resolving a code is one index lookup.
--
-- Deliberately NOT unique: two ids sharing a 10-character prefix is a
-- one-in-a-trillion event, and a unique constraint would turn that event into
-- a user who cannot be created at all. On a clash the lookup picks one, which
-- costs a single misattributed referral at worst.
--
-- ── The rules the table enforces ────────────────────────────
--   referred_id UNIQUE      an account is referred at most once
--   CHECK (no self-referral) belt and braces; the app checks first
--   ON DELETE CASCADE        deleting either account removes the link
--
-- No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT
  GENERATED ALWAYS AS (substr(replace(id::text, '-', ''), 1, 10)) STORED;

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

CREATE TABLE IF NOT EXISTS referrals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_id)
);

-- The referral page lists one referrer's rows, newest first.
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals(referrer_id, created_at DESC);

-- Same lockdown as users (014): reachable only over the app's own connection.
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON referrals FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- Every user has a code:
--   SELECT count(*) FROM users WHERE referral_code IS NULL;   -- expect 0
--
-- The browser roles cannot read referrals:
--   SET ROLE anon; SELECT * FROM referrals;                   -- must fail
