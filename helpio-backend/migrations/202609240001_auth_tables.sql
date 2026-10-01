CREATE TABLE IF NOT EXISTS auth_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('admin', 'customer', 'provider')),
    email_verified boolean NOT NULL DEFAULT false,
    auth_provider varchar(20) NOT NULL DEFAULT 'email',
    google_sub varchar(255) UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_users_email ON auth_users (email);
CREATE INDEX IF NOT EXISTS ix_auth_users_google_sub ON auth_users (google_sub);

CREATE TABLE IF NOT EXISTS auth_otps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    purpose varchar(30) NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
    otp_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auth_otps_user_purpose_consumed
    ON auth_otps (user_id, purpose, consumed_at);

ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;

