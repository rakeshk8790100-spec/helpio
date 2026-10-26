-- Four 25% milestones per hired job (photos + note, customer approval), a shared timeline, and in-app notifications.

CREATE TABLE IF NOT EXISTS job_milestones (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 4),
    percent smallint NOT NULL CHECK (percent IN (25, 50, 75, 100)),
    status varchar(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'approved', 'changes_requested')),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ux_job_milestones_job_stage UNIQUE (job_id, stage)
);

CREATE TABLE IF NOT EXISTS job_milestone_submissions (
    id uuid PRIMARY KEY,
    milestone_id uuid NOT NULL REFERENCES job_milestones(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 1000),
    review_status varchar(20) NOT NULL DEFAULT 'submitted'
        CHECK (review_status IN ('submitted', 'approved', 'changes_requested')),
    review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
    reviewed_at timestamptz,
    submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_job_milestone_submissions_milestone_id ON job_milestone_submissions (milestone_id);

CREATE TABLE IF NOT EXISTS job_milestone_photos (
    id uuid PRIMARY KEY,
    submission_id uuid NOT NULL REFERENCES job_milestone_submissions(id) ON DELETE CASCADE,
    url text NOT NULL,
    public_id varchar(200) NOT NULL UNIQUE,
    resource_type varchar(10) NOT NULL CHECK (resource_type IN ('image', 'video')),
    content_type varchar(20) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_job_milestone_photos_submission_id ON job_milestone_photos (submission_id);

CREATE TABLE IF NOT EXISTS job_events (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
    type varchar(24) NOT NULL
        CHECK (type IN ('hired', 'started', 'milestone_submitted', 'milestone_approved', 'changes_requested', 'completed')),
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_job_events_job_created ON job_events (job_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    type varchar(32) NOT NULL,
    title varchar(120) NOT NULL,
    body text NOT NULL,
    job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
    link varchar(200),
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON notifications (user_id, read_at);
CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications (user_id, created_at DESC);

ALTER TABLE job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_milestone_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_milestone_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE job_milestones, job_milestone_submissions, job_milestone_photos, job_events, notifications
    FROM anon, authenticated;

-- Jobs hired before milestones existed get their four stages
INSERT INTO job_milestones (id, job_id, stage, percent)
SELECT gen_random_uuid(), j.id, s.stage, s.stage * 25
FROM jobs j CROSS JOIN (VALUES (1), (2), (3), (4)) AS s(stage)
WHERE j.status IN ('accepted', 'funded', 'in_progress')
ON CONFLICT (job_id, stage) DO NOTHING;
