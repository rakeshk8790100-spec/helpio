-- Services a customer asked for that aren't in the catalog yet. Each counts toward their 8 favourites while
-- pending; an admin adds it as a service (or matches it to one), which turns it into a real favourite, or rejects it.

CREATE TABLE IF NOT EXISTS customer_service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name varchar(60) NOT NULL,
    -- slug of the name, so the same request from several customers is handled once
    name_key varchar(60) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    skill_id varchar(60) REFERENCES catalog_skills(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES auth_users(id) ON DELETE SET NULL,
    UNIQUE (user_id, name_key)
);

CREATE INDEX IF NOT EXISTS ix_customer_service_requests_status_key ON customer_service_requests (status, name_key);

ALTER TABLE customer_service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE customer_service_requests FROM anon, authenticated;
