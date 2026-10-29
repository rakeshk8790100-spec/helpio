-- Admin console, part 1: accounts that need approval (admins now; customers and providers next), the admin login
-- code, admin access requests and the audit log of every admin action.

-- Existing accounts are all approved; new admins (and, when switched on, new customers and providers) start pending
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS approval_status varchar(10) NOT NULL DEFAULT 'approved';
ALTER TABLE auth_users DROP CONSTRAINT IF EXISTS auth_users_approval_status_check;
ALTER TABLE auth_users ADD CONSTRAINT auth_users_approval_status_check
    CHECK (approval_status IN ('approved', 'pending', 'rejected'));
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS approval_note text;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_auth_users_role_approval ON auth_users (role, approval_status);

ALTER TABLE auth_otps DROP CONSTRAINT IF EXISTS auth_otps_purpose_check;
ALTER TABLE auth_otps ADD CONSTRAINT auth_otps_purpose_check
    CHECK (purpose IN ('signup', 'login', 'password_reset', 'admin_login'));

-- Someone asking for admin access proves their email the same way a customer does
ALTER TABLE auth_pending_signups DROP CONSTRAINT IF EXISTS auth_pending_signups_role_check;
ALTER TABLE auth_pending_signups ADD CONSTRAINT auth_pending_signups_role_check
    CHECK (role IN ('admin', 'customer', 'provider'));

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY,
    admin_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
    -- The email typed, for logins that failed before an admin was known
    actor_email varchar(320),
    action varchar(40) NOT NULL,
    target_type varchar(20),
    target_id varchar(64),
    summary text NOT NULL,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip varchar(45),
    user_agent varchar(300),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_admin_audit_log_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_admin_audit_log_admin_created ON admin_audit_log (admin_id, created_at DESC);
-- Counting recent failed logins for one email (the lockout)
CREATE INDEX IF NOT EXISTS ix_admin_audit_log_action_email_created ON admin_audit_log (action, actor_email, created_at);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE admin_audit_log FROM anon, authenticated;
