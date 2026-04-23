-- Migration: Add community contribution columns to venues
-- Allows regular users (customers) to contribute venue data.

ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS is_community_contributed boolean DEFAULT false;

ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS contributed_by uuid;

-- Index for querying community-contributed venues
CREATE INDEX IF NOT EXISTS idx_venues_community
  ON venue_schema.venues (is_community_contributed)
  WHERE is_community_contributed = true;
