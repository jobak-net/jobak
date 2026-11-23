-- ============================================================
-- Jobak — the name and CVs a user applies with
--
-- The AI tools (CV review, cover letter, CV tailoring) each asked for the
-- user's name and CV on every visit. Both are now asked once and kept:
--
--   user_preferences.applicant_name   the name the user writes on applications.
--       Not `users.full_name`: that one is copied from the identity provider
--       (Clerk) on every sign-in webhook, so an edit there would be
--       overwritten. NULL means "use the account's name".
--
--   user_cvs   the user's CVs, as plain text: a file is read in the browser
--       and only its text reaches the server, so there's no file storage. The
--       app keeps the 5 most recently used per user (it prunes on save), and
--       the same text is stored once (`content_hash`, unique per user): using
--       it again moves it to the top (`last_used_at`).
--
-- The bounds match the API's (`CV_REVIEW_LIMITS`, src/shared/contracts/cv-review.ts):
-- 200-10,000 characters, a PDF of at most 2 pages.
--
-- A CV is personal data: rows go with the user (ON DELETE CASCADE), the user
-- can delete each one, and like every user table this one is reachable only
-- over the app's own connection (RLS on, browser roles revoked).
--
-- No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS applicant_name TEXT;

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_applicant_name_length;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_applicant_name_length CHECK (
  applicant_name IS NULL OR char_length(btrim(applicant_name)) BETWEEN 1 AND 120
);

COMMENT ON COLUMN user_preferences.applicant_name IS
  'The name the user writes on applications (cover letters, CVs). NULL = the account''s name (users.full_name, synced from Clerk).';

CREATE TABLE IF NOT EXISTS user_cvs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- What the picker shows: the file's name, or "Pasted CV".
  label         TEXT NOT NULL,
  content       TEXT NOT NULL,
  -- Where the text came from: a PDF or Word file read in the browser, or pasted.
  source        TEXT NOT NULL,
  -- A PDF's page count; NULL for Word and pasted text.
  pages         SMALLINT,
  -- SHA-256 of the text (hex), so the same CV is kept once per user.
  content_hash  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_cvs_label_length CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  CONSTRAINT user_cvs_content_length CHECK (char_length(content) BETWEEN 200 AND 10000),
  CONSTRAINT user_cvs_source CHECK (source IN ('pdf', 'docx', 'text')),
  CONSTRAINT user_cvs_pages CHECK (pages IS NULL OR pages BETWEEN 1 AND 2),
  CONSTRAINT user_cvs_hash_shape CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT user_cvs_one_copy UNIQUE (user_id, content_hash)
);

-- The picker lists one user's CVs, most recently used first.
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_last_used
  ON user_cvs(user_id, last_used_at DESC);

-- Same lockdown as users (014): reachable only over the app's own connection.
ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_cvs FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'user_preferences' AND column_name = 'applicant_name';   -- 1 row
--   SELECT count(*) FROM user_cvs;                                               -- 0 on a fresh install
--
-- The browser roles cannot read CVs:
--   SET ROLE anon; SELECT * FROM user_cvs;                                       -- must fail
