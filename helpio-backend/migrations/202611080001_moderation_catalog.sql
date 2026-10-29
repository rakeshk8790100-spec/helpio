-- Admin console, part 3: hiding abusive reviews (kept for the record, never deleted) and switching catalog
-- categories and skills off (existing jobs and providers keep theirs; new ones can't pick them).

ALTER TABLE job_reviews ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE job_reviews ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES auth_users(id) ON DELETE SET NULL;
ALTER TABLE job_reviews ADD COLUMN IF NOT EXISTS hidden_reason text;

ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE catalog_skills ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
