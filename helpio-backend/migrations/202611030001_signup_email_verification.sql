-- Sign-up proves the email first: the details wait here until the emailed code is entered, and only then is
-- the account created. One row per code sent; the newest open row is the one that counts.
CREATE TABLE IF NOT EXISTS auth_pending_signups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL,
    name varchar(80) NOT NULL,
    phone varchar(13) NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('customer', 'provider')),
    password_hash text NOT NULL,
    otp_hash text NOT NULL,
    attempts smallint NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_pending_signups_email_created ON auth_pending_signups (email, created_at);

ALTER TABLE auth_pending_signups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE auth_pending_signups FROM anon, authenticated;
