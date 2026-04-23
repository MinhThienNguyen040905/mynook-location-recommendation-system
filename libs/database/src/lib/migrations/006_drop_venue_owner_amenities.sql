-- Migration: Drop unused owner_amenities column from venues table.
-- Rationale: the column was only consumed by the UI for display; it was never
-- indexed, searched, filtered, ranked, or fed into AI tag generation. Removing
-- it eliminates dead schema and simplifies the venue write path.

ALTER TABLE venue_schema.venues
  DROP COLUMN IF EXISTS owner_amenities;
