-- Pay after the work: once all four stages are approved the job is payment_due, the customer pays the hired quote on
-- a Razorpay Payment Link, every attempt on it is kept, and Helpio pays the pro by hand. Plus one review each way per job.

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
    'draft', 'open', 'accepted', 'funded', 'in_progress', 'payment_due', 'completed', 'cancelled', 'disputed'
));

ALTER TABLE job_events DROP CONSTRAINT IF EXISTS job_events_type_check;
ALTER TABLE job_events ADD CONSTRAINT job_events_type_check CHECK (type IN (
    'hired', 'started', 'milestone_submitted', 'milestone_approved', 'changes_requested', 'stage_overdue',
    'payment_failed', 'paid', 'reviewed', 'completed'
));

-- One row per Razorpay Payment Link. A failed try leaves it pending; a new link replaces it only once it has expired.
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    provider_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    amount_paise integer NOT NULL CHECK (amount_paise > 0),
    currency char(3) NOT NULL DEFAULT 'INR',
    status varchar(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    razorpay_link_id varchar(40) NOT NULL UNIQUE,
    -- Razorpay creates the link's order when the customer first opens it
    razorpay_order_id varchar(40),
    short_url text NOT NULL,
    razorpay_payment_id varchar(40),
    method varchar(20),
    last_error text,
    expires_at timestamptz NOT NULL,
    paid_at timestamptz,
    synced_at timestamptz,
    payout_status varchar(10) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
    payout_reference varchar(80),
    payout_at timestamptz,
    payout_by uuid REFERENCES auth_users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_payments_job_created ON payments (job_id, created_at);
CREATE INDEX IF NOT EXISTS ix_payments_razorpay_order_id ON payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS ix_payments_provider_status ON payments (provider_id, status);
-- Never two open links, or a second payment, for one job
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_job_live ON payments (job_id) WHERE status IN ('pending', 'paid');

-- Every try on a link, as Razorpay reports it: failures with their reason, and the captured payment
CREATE TABLE IF NOT EXISTS payment_attempts (
    id uuid PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    razorpay_payment_id varchar(40) NOT NULL UNIQUE,
    status varchar(12) NOT NULL CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
    method varchar(20),
    amount_paise integer NOT NULL,
    error_code varchar(60),
    error_description text,
    raw jsonb NOT NULL DEFAULT '{}'::jsonb,
    attempted_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_payment_attempts_payment_id ON payment_attempts (payment_id);

-- One review each way per job. Databases set up earlier may already have this exact table; it's kept as is.
CREATE TABLE IF NOT EXISTS job_reviews (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    author_role varchar NOT NULL CHECK (author_role IN ('customer', 'provider')),
    stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    revealed_at timestamptz,
    CONSTRAINT ux_job_reviews_job_author UNIQUE (job_id, author_id)
);
CREATE INDEX IF NOT EXISTS ix_job_reviews_subject_revealed ON job_reviews (subject_id, revealed_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE payments, payment_attempts, job_reviews FROM anon, authenticated;
