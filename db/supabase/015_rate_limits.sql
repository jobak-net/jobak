-- ============================================================
-- Jobak — shared rate limiting
--
-- Replaces the in-memory limiter in the auth module, which counted attempts in
-- a Map on the server instance. That is per-instance and reset by every deploy,
-- so on serverless the effective limit was the configured one multiplied by
-- however many functions happened to be warm — and an attacker spreading
-- requests across instances got a fresh budget from each.
--
-- Counting in Postgres makes the limit mean what it says, whatever is running.
-- ============================================================
--
-- No BEGIN/COMMIT: the runner in scripts/db/migration.ts wraps each migration
-- in a transaction already.

/*
 * One row per bucket, where a bucket is a caller doing a thing — "login from
 * 1.2.3.4", "resend-verification for 5.6.7.8".
 *
 * A fixed window rather than a sliding one: `window_started_at` marks when
 * counting began, and the row resets once the window has passed. A sliding
 * window would need every attempt stored individually, which is a lot of rows
 * to write and sweep for a guarantee nobody here needs — the imprecision at a
 * boundary (up to 2x the limit across two adjacent windows) is acceptable for
 * bounding abuse.
 */
CREATE TABLE IF NOT EXISTS rate_limits (
  -- "<action>:<identifier>", built by the application. Text rather than two
  -- columns because nothing ever queries by action alone.
  key                TEXT PRIMARY KEY,
  count              INT NOT NULL DEFAULT 0,
  window_started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supports the sweep below. Not needed for the consume path, which is a primary
-- key lookup.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON rate_limits(window_started_at);

/*
 * Records an attempt and reports whether it is allowed.
 *
 * ── Why a function and not three statements ─────────────────
 * The check and the increment have to be one atomic operation. Read-then-write
 * from the application would let N concurrent requests all read the same count
 * and all decide they were under the limit — which is exactly the case a
 * limiter exists to stop.
 *
 * `INSERT … ON CONFLICT DO UPDATE` does it in a single statement: Postgres takes
 * a row lock on conflict, so concurrent callers serialise on that row and each
 * sees the previous one's increment.
 *
 * Returns the resulting count and when the window began; the caller decides
 * whether that count is over its own limit. Keeping the threshold out of the
 * database means changing a limit is a code change, not a migration.
 */
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_key       TEXT,
  p_window    INTERVAL
)
RETURNS TABLE (current_count INT, window_started_at TIMESTAMPTZ)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO rate_limits AS rl (key, count, window_started_at)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
    SET
      /*
       * Expired window: start over at 1. Otherwise increment.
       *
       * Both branches are evaluated against the row as it was before this
       * statement, so this is the reset-or-increment decision made atomically
       * rather than in two steps with a gap between them.
       */
      count = CASE
                WHEN rl.window_started_at < NOW() - p_window THEN 1
                ELSE rl.count + 1
              END,
      window_started_at = CASE
                WHEN rl.window_started_at < NOW() - p_window THEN NOW()
                ELSE rl.window_started_at
              END
  RETURNING rl.count, rl.window_started_at;
END;
$$;

/*
 * SECURITY DEFINER so the function may write to a table the caller cannot touch
 * directly. Without it, granting the app enough privilege to count attempts
 * would also let anything holding those credentials reset a counter.
 *
 * Execute is revoked from the browser-facing roles: only our own server
 * connection calls this.
 */
REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTERVAL) FROM PUBLIC, anon, authenticated;

/*
 * Deletes rows whose window closed long ago.
 *
 * Without a sweep this table grows one row per distinct key forever — and since
 * keys include client-supplied IPs, that is attacker-controlled growth. Called
 * opportunistically by the application rather than scheduled, so it needs no
 * pg_cron.
 *
 * The age cutoff is generous on purpose: a row still inside its window must
 * never be deleted, or deleting it would hand the caller a fresh budget.
 */
CREATE OR REPLACE FUNCTION sweep_rate_limits(p_older_than INTERVAL DEFAULT '1 day')
RETURNS INT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM rate_limits
  WHERE window_started_at < NOW() - p_older_than;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION sweep_rate_limits(INTERVAL) FROM PUBLIC, anon, authenticated;

/*
 * The table itself is unreachable from the browser. RLS with no policy denies
 * everything to anon/authenticated, and the REVOKE covers the rest — the
 * SECURITY DEFINER functions above are the only way in.
 */
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Verify ───────────────────────────────────────────────────
-- Three calls in a 1-minute window should count 1, 2, 3:
--   SELECT * FROM consume_rate_limit('test:1', INTERVAL '1 minute');
--
-- And a zero-length window should always reset to 1:
--   SELECT * FROM consume_rate_limit('test:2', INTERVAL '0 seconds');
--
-- Clean up after checking:
--   DELETE FROM rate_limits WHERE key LIKE 'test:%';
