-- Passwordless email-code login and basic profile fields.

ALTER TABLE auth_users
    ADD COLUMN IF NOT EXISTS name varchar(80),
    ADD COLUMN IF NOT EXISTS phone varchar(13),
    ADD COLUMN IF NOT EXISTS avatar_url text;

-- One account per mobile number (NULLs are allowed for many rows).
CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_users_phone ON auth_users (phone);

ALTER TABLE auth_otps
    ADD COLUMN IF NOT EXISTS attempts smallint NOT NULL DEFAULT 0;

ALTER TABLE auth_otps DROP CONSTRAINT IF EXISTS auth_otps_purpose_check;
ALTER TABLE auth_otps
    ADD CONSTRAINT auth_otps_purpose_check CHECK (purpose IN ('signup', 'login', 'password_reset'));

-- Rate limiting looks up recent codes per user and purpose.
CREATE INDEX IF NOT EXISTS ix_auth_otps_user_purpose_created
    ON auth_otps (user_id, purpose, created_at);

REVOKE ALL ON TABLE auth_users, auth_otps FROM anon, authenticated;
