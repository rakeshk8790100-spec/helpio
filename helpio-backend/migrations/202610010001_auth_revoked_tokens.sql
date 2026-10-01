CREATE TABLE IF NOT EXISTS auth_revoked_tokens (
    token_hash varchar(64) PRIMARY KEY,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_auth_revoked_tokens_expires_at ON auth_revoked_tokens (expires_at);
ALTER TABLE auth_revoked_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE auth_revoked_tokens FROM anon, authenticated;
