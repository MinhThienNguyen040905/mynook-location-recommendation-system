-- Migration 010: Keep search_schema.tags.usage_count auto-fresh.
--
-- Migration 007 seeded `usage_count` once from existing venue_tags rows. Without
-- a trigger, new reviews → AI tag extraction → upsert venue_tags would NOT
-- update the count, and CategoryTagProvider's "top-100 popular tags" would
-- drift over time.
--
-- This trigger maintains the count incrementally on every venue_tags insert /
-- update / delete. Increments only count rows where score > 0 (positive tags).

CREATE OR REPLACE FUNCTION search_schema.bump_tag_usage_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.score > 0 THEN
      UPDATE search_schema.tags
        SET usage_count = usage_count + 1
        WHERE id = NEW.tag_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.score > 0 THEN
      UPDATE search_schema.tags
        SET usage_count = GREATEST(usage_count - 1, 0)
        WHERE id = OLD.tag_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Tag re-pointed to a different tag_id (rare): treat as delete + insert
    IF NEW.tag_id IS DISTINCT FROM OLD.tag_id THEN
      IF OLD.score > 0 THEN
        UPDATE search_schema.tags
          SET usage_count = GREATEST(usage_count - 1, 0)
          WHERE id = OLD.tag_id;
      END IF;
      IF NEW.score > 0 THEN
        UPDATE search_schema.tags
          SET usage_count = usage_count + 1
          WHERE id = NEW.tag_id;
      END IF;
    -- Same tag, score crossed the > 0 boundary
    ELSIF (OLD.score > 0) IS DISTINCT FROM (NEW.score > 0) THEN
      IF NEW.score > 0 THEN
        UPDATE search_schema.tags
          SET usage_count = usage_count + 1
          WHERE id = NEW.tag_id;
      ELSE
        UPDATE search_schema.tags
          SET usage_count = GREATEST(usage_count - 1, 0)
          WHERE id = NEW.tag_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_tags_bump_usage ON search_schema.venue_tags;

CREATE TRIGGER trg_venue_tags_bump_usage
AFTER INSERT OR UPDATE OR DELETE ON search_schema.venue_tags
FOR EACH ROW
EXECUTE FUNCTION search_schema.bump_tag_usage_count();

-- Resync: counts may have drifted between migration 007 and now. Recompute
-- once so the trigger starts from a correct baseline.
UPDATE search_schema.tags t
SET usage_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT tag_id, COUNT(*) AS cnt
  FROM search_schema.venue_tags
  WHERE score > 0
  GROUP BY tag_id
) sub
WHERE t.id = sub.tag_id;

UPDATE search_schema.tags t
SET usage_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM search_schema.venue_tags vt
  WHERE vt.tag_id = t.id AND vt.score > 0
);
