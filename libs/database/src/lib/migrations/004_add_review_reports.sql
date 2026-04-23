-- Migration: Review Reports (admin moderation)
-- Lưu mọi lần user report review vi phạm. Admin xử lý bằng cách
-- đổi status → resolved_deleted (đã xóa review) hoặc dismissed.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
    CREATE TYPE interaction_schema.report_status_enum AS ENUM (
      'pending',
      'resolved_deleted',
      'dismissed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS interaction_schema.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  reporter_account_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status interaction_schema.report_status_enum NOT NULL DEFAULT 'pending',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_reports_status
  ON interaction_schema.review_reports (status);

CREATE INDEX IF NOT EXISTS idx_review_reports_review
  ON interaction_schema.review_reports (review_id);

CREATE INDEX IF NOT EXISTS idx_review_reports_reporter
  ON interaction_schema.review_reports (reporter_account_id);
