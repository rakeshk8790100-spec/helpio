-- Start a hired job with the customer's PIN, and chat between the customer and the hired pro.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_pin char(4);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS start_pin_attempts smallint NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_start_pin_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_start_pin_check CHECK (start_pin ~ '^[0-9]{4}$');

CREATE TABLE IF NOT EXISTS job_messages (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_job_messages_job_created ON job_messages (job_id, created_at);

ALTER TABLE job_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE job_messages FROM anon, authenticated;

-- Jobs hired before start PINs existed get one, so their pro can start
UPDATE jobs SET start_pin = lpad(floor(random() * 10000)::int::text, 4, '0'), start_pin_attempts = 0
WHERE status = 'accepted' AND start_pin IS NULL;
