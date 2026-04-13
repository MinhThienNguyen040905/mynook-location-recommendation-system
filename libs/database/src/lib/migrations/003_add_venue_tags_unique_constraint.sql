-- Migration: Add unique constraint on venue_tags for upsert support
-- Required for ON CONFLICT (venue_id, tag_id, time_frame) in review processing
-- Run this on Supabase SQL Editor

ALTER TABLE search_schema.venue_tags
  ADD CONSTRAINT uq_venue_tags_venue_tag_time
  UNIQUE (venue_id, tag_id, time_frame);
