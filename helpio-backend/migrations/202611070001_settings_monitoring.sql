-- Admin console, part 2: settings the owner changes without a redeploy (third-party keys encrypted), and what the
-- status page watches: background jobs' heartbeats and unexpected server errors.

-- Saved in the console; each one overrides the same setting from .env. Secrets hold Fernet ciphertext.
CREATE TABLE IF NOT EXISTS app_settings (
    key varchar(60) PRIMARY KEY,
    value text NOT NULL,
    is_secret boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES auth_users(id) ON DELETE SET NULL
);

-- The last time each background job (late-update check, Razorpay webhooks) worked or failed
CREATE TABLE IF NOT EXISTS system_heartbeats (
    name varchar(40) PRIMARY KEY,
    last_ok_at timestamptz,
    last_error_at timestamptz,
    last_error text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unexpected 500s, one row per kind (method, route, error type), counted
CREATE TABLE IF NOT EXISTS system_errors (
    id uuid PRIMARY KEY,
    fingerprint varchar(64) NOT NULL UNIQUE,
    method varchar(10) NOT NULL,
    path varchar(200) NOT NULL,
    error_type varchar(120) NOT NULL,
    message text NOT NULL,
    count integer NOT NULL DEFAULT 1,
    first_seen timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_system_errors_last_seen ON system_errors (last_seen DESC);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_settings, system_heartbeats, system_errors FROM anon, authenticated;
