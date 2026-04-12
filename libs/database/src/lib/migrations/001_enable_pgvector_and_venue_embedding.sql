-- Migration: Enable pgvector extension + add embedding columns to venues
-- Run this on your Supabase/PostgreSQL database before starting search-ai-service.

-- 1. Enable the pgvector extension (Supabase has it pre-installed, just needs enabling)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add search_document column (pre-built text for embedding generation)
ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS search_document text;

-- 3. Add embedding column as vector(384) for all-MiniLM-L6-v2
ALTER TABLE venue_schema.venues
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- 4. Create HNSW index for fast cosine similarity search
--    HNSW is preferred over IVFFlat for better recall without training.
CREATE INDEX IF NOT EXISTS idx_venues_embedding_hnsw
  ON venue_schema.venues
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Create index on search_schema.venue_tags for search performance
CREATE INDEX IF NOT EXISTS idx_venue_tags_venue_id
  ON search_schema.venue_tags (venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_tags_tag_id
  ON search_schema.venue_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_venue_tags_score
  ON search_schema.venue_tags (score DESC);
