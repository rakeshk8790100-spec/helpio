-- Custom job requests and provider quotes. Escrow, PIN and milestones build on these.

CREATE TABLE IF NOT EXISTS jobs (
    id uuid PRIMARY KEY,
    customer_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    title varchar(120) NOT NULL,
    description text,
    category_id varchar(40) REFERENCES catalog_categories(id) ON DELETE RESTRICT,
    latitude numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
    pincode char(6) CHECK (pincode ~ '^[1-9][0-9]{5}$'),
    area_name varchar(80),
    budget_paise integer CHECK (budget_paise BETWEEN 10000 AND 100000000),
    scheduled_at timestamptz,
    duration_mins smallint CHECK (duration_mins BETWEEN 15 AND 1440),
    is_emergency boolean NOT NULL DEFAULT false,
    status varchar(12) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'accepted', 'funded', 'in_progress', 'completed', 'cancelled', 'disputed')),
    progress_pct smallint NOT NULL DEFAULT 0 CHECK (progress_pct IN (0, 25, 50, 75, 100)),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_jobs_customer_status ON jobs (customer_id, status);
CREATE INDEX IF NOT EXISTS ix_jobs_status_category ON jobs (status, category_id);

CREATE TABLE IF NOT EXISTS job_quotes (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    amount_paise integer NOT NULL CHECK (amount_paise BETWEEN 10000 AND 100000000),
    message text,
    status varchar(10) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ux_job_quotes_job_provider UNIQUE (job_id, provider_id)
);
CREATE INDEX IF NOT EXISTS ix_job_quotes_provider_status ON job_quotes (provider_id, status);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE jobs, job_quotes FROM anon, authenticated;
