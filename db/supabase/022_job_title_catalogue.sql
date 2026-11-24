-- ============================================================
-- Jobak — the job title catalogue grows to every occupation
-- Applied in order by the migration runner (pnpm db:migrate).
-- ============================================================
--
-- `job_titles` held ~100 hand-picked titles, almost all in tech. It now holds
-- every job title Jobak knows — the curated ones plus ~7,600 from O*NET (seeded
-- by 023_seed_onet_job_titles.sql) — and onboarding only accepts titles from
-- it, so a user's search terms and the collector's are the same vocabulary.
--
-- This file is the schema half:
--   1. fields for the occupations outside tech (healthcare, education, ...)
--   2. where each title came from (`source`, `onet_code`)
--   3. one spelling per title, case-insensitively, across all fields
--   4. a trigram index, so typing "nurs" finds titles in milliseconds
--   5. a cap on how many titles one LinkedIn-post pick examines
--
-- The hourly sweep (`collect_targets_public`, 007) is deliberately unchanged:
-- it walks every row of `job_titles`, and walking every title is the intent.
-- At the same batch size a full cycle is now ~80x longer than it was.

-- pg_trgm lives in `extensions` on Supabase and in `public` on a plain
-- Postgres. Searching both lets the index below find its operator class on
-- either; schemas that don't exist in search_path are ignored. LOCAL: it ends
-- with this file's transaction (the runner wraps each file in one), so it
-- cannot leak into the next file — and needs no RESET, which returns to the
-- server default rather than to whatever the connection had set.
SET LOCAL search_path = public, extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
  ELSE
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  END IF;
END $$;

-- ── 1. Fields beyond tech ───────────────────────────────────
-- After the existing 13, in the order the onboarding dropdown lists them.
-- Grouped from the standard occupation classification (SOC major groups);
-- 023 says which O*NET codes land where.
INSERT INTO job_fields (id, value, label, sort_order) VALUES
  (14, 'management', 'Management & Executive', 14),
  (15, 'engineering', 'Engineering & Architecture', 15),
  (16, 'science', 'Science & Research', 16),
  (17, 'healthcare', 'Healthcare & Medical', 17),
  (18, 'education', 'Education & Training', 18),
  (19, 'legal', 'Legal', 19),
  (20, 'community', 'Social & Community Services', 20),
  (21, 'arts-media', 'Arts, Media & Entertainment', 21),
  (22, 'hospitality', 'Hospitality, Food & Personal Services', 22),
  (23, 'administrative', 'Administrative & Office', 23),
  (24, 'construction', 'Construction & Extraction', 24),
  (25, 'skilled-trades', 'Trades, Maintenance & Repair', 25),
  (26, 'manufacturing', 'Manufacturing & Production', 26),
  (27, 'logistics', 'Transportation & Logistics', 27),
  (28, 'agriculture', 'Agriculture & Environment', 28),
  (29, 'protective-services', 'Protective Services', 29)
ON CONFLICT (value) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ── 2. Provenance ───────────────────────────────────────────
-- `curated` rows are the hand-picked ones from 004; `onet` rows come from the
-- O*NET seed and keep their occupation code, which is what a later re-import
-- or an AI enrichment pass joins on.
ALTER TABLE job_titles ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'curated';
ALTER TABLE job_titles ADD COLUMN IF NOT EXISTS onet_code TEXT;

ALTER TABLE job_titles DROP CONSTRAINT IF EXISTS job_titles_source_check;
ALTER TABLE job_titles ADD CONSTRAINT job_titles_source_check CHECK (source IN ('curated', 'onet'));

COMMENT ON COLUMN job_titles.source IS 'Where the title came from: curated (004) or onet (023).';
COMMENT ON COLUMN job_titles.onet_code IS 'O*NET-SOC occupation code, for onet rows.';

-- ── 3. One spelling per title ───────────────────────────────
-- (field_value, title) was unique, which still allowed "Data Engineer" under
-- two fields, or "data engineer" beside it. A title is now one row, so the
-- seed's ON CONFLICT DO NOTHING keeps the curated row on any collision and
-- onboarding can match what was typed to exactly one canonical spelling.
CREATE UNIQUE INDEX IF NOT EXISTS job_titles_title_lower_key ON job_titles (lower(title));

-- ── 4. Search ───────────────────────────────────────────────
-- A trigram GIN index serves `title ILIKE '%nurs%'` — a leading wildcard that
-- a B-tree cannot — and is case-insensitive by construction.
CREATE INDEX IF NOT EXISTS job_titles_title_trgm ON job_titles USING gin (title gin_trgm_ops);

-- ── 5. LinkedIn picks: bounded work per call ─────────────────
-- Same as 009, except for the ceiling. The loop runs one ILIKE query against
-- `jobs` per title it examines, and it used to examine up to the whole
-- catalogue: 100 queries then, ~7,700 now — long enough to time out the
-- workflow in a quiet week. It now examines at most 200 titles per call and
-- resumes from the cursor next time, so the rotation still reaches every title.
CREATE OR REPLACE FUNCTION next_linkedin_posts(
  p_batch        INT DEFAULT 1,
  p_max_age_days INT DEFAULT 14
)
RETURNS SETOF jobs
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_examined CONSTANT INT := 200;
  v_titles     TEXT[];
  v_count      INT;
  v_limit      INT;
  v_position   INT;
  v_found      INT := 0;
  v_examined   INT := 0;
  v_title      TEXT;
  v_job        jobs%ROWTYPE;
  v_posted_ids UUID[] := '{}';
BEGIN
  SELECT COALESCE(array_agg(title ORDER BY field_value, sort_order), '{}')
    INTO v_titles
    FROM job_titles;

  v_count := cardinality(v_titles);
  IF v_count = 0 THEN RETURN; END IF;
  v_limit := LEAST(v_count, c_max_examined);

  -- One lock for the whole call: the cursor is a single row and this is the
  -- only writer, so `FOR UPDATE` serialises overlapping runs cheaply.
  SELECT position INTO v_position FROM linkedin_post_cursor WHERE id = 1 FOR UPDATE;
  v_position := COALESCE(v_position, 0);

  WHILE v_found < p_batch AND v_examined < v_limit LOOP
    v_title := v_titles[(v_position % v_count) + 1];
    v_position := v_position + 1;
    v_examined := v_examined + 1;

    SELECT j.* INTO v_job
    FROM jobs j
    WHERE j.is_active
      AND j.is_relevant
      AND NOT j.is_linkedin_posted
      AND j.id <> ALL(v_posted_ids)
      AND j.created_at > NOW() - make_interval(days => p_max_age_days)
      -- Match both ways, as the matcher does: "Backend Engineer" should find
      -- "Senior Backend Engineer", and a broad role a narrower posting.
      AND (j.title ILIKE '%' || v_title || '%' OR v_title ILIKE '%' || j.title || '%')
    -- Newest first: the point of the feed is that it is new.
    ORDER BY j.created_at DESC, j.posted_at_source DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      v_posted_ids := v_posted_ids || v_job.id;
      v_found := v_found + 1;
      RETURN NEXT v_job;
    END IF;
  END LOOP;

  UPDATE linkedin_post_cursor
  SET position = v_position % v_count, updated_at = NOW()
  WHERE id = 1;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION next_linkedin_posts(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION next_linkedin_posts(INT, INT) TO service_role;
