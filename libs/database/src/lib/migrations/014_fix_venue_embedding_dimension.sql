-- Fix venue embedding dimension to match sentence-transformers/all-MiniLM-L6-v2.
-- The application generates 384-dimensional vectors; older databases may still
-- have venue_schema.venues.embedding as vector(1536), causing every embedding
-- update to fail with "expected 1536 dimensions, not 384".

DROP INDEX IF EXISTS venue_schema.idx_venues_embedding_hnsw;

ALTER TABLE venue_schema.venues
  ALTER COLUMN embedding TYPE vector(384)
  USING embedding::vector(384);

CREATE INDEX IF NOT EXISTS idx_venues_embedding_hnsw
  ON venue_schema.venues
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
