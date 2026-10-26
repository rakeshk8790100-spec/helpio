-- Time-based stages: the pro's time estimate on starting, a target time per quarter of the work,
-- and a one-time overdue alert per stage.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_mins smallint;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_estimated_mins_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_estimated_mins_check CHECK (estimated_mins BETWEEN 15 AND 1440);

ALTER TABLE job_milestones ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE job_milestones ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;
CREATE INDEX IF NOT EXISTS ix_job_milestones_due ON job_milestones (due_at) WHERE overdue_notified_at IS NULL;

ALTER TABLE job_events DROP CONSTRAINT IF EXISTS job_events_type_check;
ALTER TABLE job_events ADD CONSTRAINT job_events_type_check CHECK (type IN (
    'hired', 'started', 'milestone_submitted', 'milestone_approved', 'changes_requested', 'stage_overdue', 'completed'
));
