-- Email + password sign-in for customers and providers (replaces email-code login).

-- Every access token carries the version it was issued with. Bumping it (password reset, or Google
-- reclaiming an email nobody had proven) signs the user out on every device.
ALTER TABLE auth_users
    ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

REVOKE ALL ON TABLE auth_users FROM anon, authenticated;
