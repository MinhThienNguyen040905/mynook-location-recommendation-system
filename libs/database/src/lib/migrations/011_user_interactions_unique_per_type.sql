-- Migration 011: De-duplicate user_interactions and enforce one-row-per-(user, venue, type).
--
-- Without a unique constraint, every venue page refresh inserts a new row with
-- `interaction_type='view'`. The Recently-Viewed query collapses duplicates on
-- read (CTE GROUP BY venue_id MAX(created_at)), but the table grows unbounded.
--
-- Going forward, `trackView` will UPSERT (ON CONFLICT DO UPDATE) so each
-- (account_id, venue_id, interaction_type) keeps one row whose `created_at`
-- always reflects the latest view.
--
-- Step 1: collapse existing duplicates, keeping the row with the latest
-- created_at (and aggregating time_spent_seconds so it isn't lost).
WITH ranked AS (
  SELECT
    id,
    account_id,
    venue_id,
    interaction_type,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY account_id, venue_id, interaction_type
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM interaction_schema.user_interactions
), totals AS (
  SELECT
    account_id,
    venue_id,
    interaction_type,
    SUM(time_spent_seconds) AS total_time
  FROM interaction_schema.user_interactions
  GROUP BY account_id, venue_id, interaction_type
)
DELETE FROM interaction_schema.user_interactions ui
USING ranked r
WHERE ui.id = r.id AND r.rn > 1;

-- Aggregate time_spent_seconds into the surviving row so historical session
-- totals aren't silently lost.
UPDATE interaction_schema.user_interactions ui
SET time_spent_seconds = t.total_time
FROM (
  SELECT
    account_id,
    venue_id,
    interaction_type,
    SUM(time_spent_seconds) AS total_time
  FROM interaction_schema.user_interactions
  GROUP BY account_id, venue_id, interaction_type
) t
WHERE ui.account_id = t.account_id
  AND ui.venue_id = t.venue_id
  AND ui.interaction_type IS NOT DISTINCT FROM t.interaction_type
  AND ui.time_spent_seconds <> t.total_time;

-- Step 2: enforce uniqueness so the upsert in trackView() can use ON CONFLICT.
-- Two indexes because PostgreSQL UNIQUE treats NULLs as distinct (we still want
-- to dedup rows where interaction_type IS NULL, in case any legacy rows exist).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_interactions_per_type
  ON interaction_schema.user_interactions (account_id, venue_id, interaction_type)
  WHERE interaction_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_interactions_null_type
  ON interaction_schema.user_interactions (account_id, venue_id)
  WHERE interaction_type IS NULL;
