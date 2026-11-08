-- ============================================================
-- Jobak — make the location shape check actually check
--
-- 020's `user_preferences_location_shape` let a malformed value through, e.g.
-- `{"country": "EG"}`. Each condition reads a key that may be missing, and a
-- missing key makes `jsonb_typeof(...) = 'boolean'` NULL rather than false.
-- A CHECK constraint only rejects a row when its expression is false — NULL
-- passes — so a location without the expected keys was accepted.
--
-- Rewritten with `IS TRUE` on each condition, which turns NULL into false.
-- Found by the rolled-back test run after 020 was applied; 020 is left as it
-- is, since it has run.
--
-- No BEGIN/COMMIT: the runner wraps each file in a transaction.
-- ============================================================

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_location_shape;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_location_shape CHECK (
  location IS NULL
  OR (
    (jsonb_typeof(location) = 'object') IS TRUE
    AND (jsonb_typeof(location -> 'worldwide') = 'boolean') IS TRUE
    AND (jsonb_typeof(location -> 'countries') = 'array') IS TRUE
  )
);
