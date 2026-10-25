-- Direct requests: a customer sends an open job to a chosen pro, who replies with a quote or declines.

CREATE TABLE IF NOT EXISTS job_invites (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    message text CHECK (char_length(message) <= 2000),
    status varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'declined')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ux_job_invites_job_provider UNIQUE (job_id, provider_id)
);
CREATE INDEX IF NOT EXISTS ix_job_invites_provider_status ON job_invites (provider_id, status);

ALTER TABLE job_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE job_invites FROM anon, authenticated;
