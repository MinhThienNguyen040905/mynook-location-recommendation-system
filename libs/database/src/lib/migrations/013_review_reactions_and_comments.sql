-- Migration 013: Review reactions and threaded comments.

CREATE TABLE IF NOT EXISTS interaction_schema.review_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES interaction_schema.reviews(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth_schema.accounts(id) ON DELETE CASCADE,
  reaction_type varchar(20) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_review_reactions_review_account UNIQUE (review_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reactions_review
  ON interaction_schema.review_reactions(review_id);

CREATE TABLE IF NOT EXISTS interaction_schema.review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES interaction_schema.reviews(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth_schema.accounts(id) ON DELETE CASCADE,
  parent_comment_id uuid NULL REFERENCES interaction_schema.review_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interaction_schema.review_comments
  ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_review_comments_review_created
  ON interaction_schema.review_comments(review_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_review_comments_parent
  ON interaction_schema.review_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;
