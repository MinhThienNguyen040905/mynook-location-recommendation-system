-- Google Maps import pipeline

DO $$
BEGIN
  CREATE TYPE venue_schema.venue_import_status AS ENUM (
    'draft',
    'enriched',
    'ready',
    'published',
    'rejected',
    'duplicate'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE  TABLE IF NOT EXISTS venue_schema.venue_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source varchar(50) NOT NULL DEFAULT 'google_maps',
  source_place_id varchar(255),
  source_url text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status venue_schema.venue_import_status NOT NULL DEFAULT 'draft',
  matched_venue_id uuid NULL,
  published_venue_id uuid NULL,
  confidence double precision NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_imports_status
  ON venue_schema.venue_imports (status);

CREATE INDEX IF NOT EXISTS idx_venue_imports_source_place_id
  ON venue_schema.venue_imports (source_place_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_venue_imports_matched_venue'
  ) THEN
    ALTER TABLE venue_schema.venue_imports
      ADD CONSTRAINT fk_venue_imports_matched_venue
      FOREIGN KEY (matched_venue_id) REFERENCES venue_schema.venues(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_venue_imports_published_venue'
  ) THEN
    ALTER TABLE venue_schema.venue_imports
      ADD CONSTRAINT fk_venue_imports_published_venue
      FOREIGN KEY (published_venue_id) REFERENCES venue_schema.venues(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS venue_schema.venue_import_review_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_import_id uuid NOT NULL,
  review_id uuid NOT NULL,
  source varchar(50) NOT NULL DEFAULT 'google_maps',
  source_review_id varchar(255),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_import_review_sources_import_id
  ON venue_schema.venue_import_review_sources (venue_import_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_venue_import_review_sources_import'
  ) THEN
    ALTER TABLE venue_schema.venue_import_review_sources
      ADD CONSTRAINT fk_venue_import_review_sources_import
      FOREIGN KEY (venue_import_id) REFERENCES venue_schema.venue_imports(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_venue_import_review_sources_review'
  ) THEN
    ALTER TABLE venue_schema.venue_import_review_sources
      ADD CONSTRAINT fk_venue_import_review_sources_review
      FOREIGN KEY (review_id) REFERENCES interaction_schema.reviews(id)
      ON DELETE CASCADE;
  END IF;
END $$;
