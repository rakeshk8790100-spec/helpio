-- Customer saved addresses and the provider's public bio.

CREATE TABLE IF NOT EXISTS customer_addresses (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    label varchar(10) NOT NULL CHECK (label IN ('home', 'work', 'other')),
    -- Full address: shared with a pro only after hire
    address_line text CHECK (char_length(address_line) <= 300),
    area_name varchar(80) NOT NULL,
    pincode char(6) NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),
    latitude numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX IF NOT EXISTS ix_customer_addresses_user_id ON customer_addresses (user_id);
-- At most one default per customer
CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_addresses_default ON customer_addresses (user_id) WHERE is_default;

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_bio_check;
ALTER TABLE provider_profiles ADD CONSTRAINT provider_profiles_bio_check CHECK (char_length(bio) <= 500);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE customer_addresses FROM anon, authenticated;
