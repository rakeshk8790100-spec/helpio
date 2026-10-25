-- Service radius in metres, so providers can choose less than 1 km (500 m to 50 km).

ALTER TABLE provider_profiles
    ADD COLUMN IF NOT EXISTS radius_m integer;

-- Carry over radii saved in kilometres, then drop the old column (skipped once it is gone).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_profiles' AND column_name = 'radius_km'
    ) THEN
        UPDATE provider_profiles SET radius_m = radius_km * 1000 WHERE radius_m IS NULL AND radius_km IS NOT NULL;
        ALTER TABLE provider_profiles DROP COLUMN radius_km;
    END IF;
END $$;

ALTER TABLE provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_radius_m_check;
ALTER TABLE provider_profiles
    ADD CONSTRAINT provider_profiles_radius_m_check CHECK (radius_m BETWEEN 500 AND 50000);

REVOKE ALL ON TABLE provider_profiles FROM anon, authenticated;
