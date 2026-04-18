-- Migration: Venue Reports (admin moderation)
-- User report venue giả mạo, sai thông tin, vi phạm.
-- Admin xử lý: vô hiệu hóa venue (resolved_deactivated) hoặc dismiss.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_report_status_enum') THEN
    CREATE TYPE interaction_schema.venue_report_status_enum AS ENUM (
      'pending',
      'resolved_deactivated',
      'dismissed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS interaction_schema.venue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL,
  reporter_account_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status interaction_schema.venue_report_status_enum NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_reports_status
  ON interaction_schema.venue_reports (status);

CREATE INDEX IF NOT EXISTS idx_venue_reports_venue
  ON interaction_schema.venue_reports (venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_reports_reporter
  ON interaction_schema.venue_reports (reporter_account_id);
