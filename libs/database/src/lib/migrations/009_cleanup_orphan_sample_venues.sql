-- Migration 009: Reset sample venues left over from migration 008.
--
-- After migration 008 dropped `address`/`city`/`district` text columns,
-- existing sample venues are missing `city_id`, `district_id`, `address_line`
-- and have no categories or embedding. Since the data is sample-only, the
-- simplest path is to wipe and re-create via the UI.
--
-- This DELETE cascades to venue_categories. Reviews/favorites/etc that
-- reference venues will hit FK violations — clear those tables first if you
-- have related sample data, or use the soft-delete variant below.

-- Hard reset:
DELETE FROM venue_schema.venues;

-- Soft variant (uncomment if you'd rather keep the rows):
-- UPDATE venue_schema.venues SET is_active = false, updated_at = now();
