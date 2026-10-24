-- Skills catalogue and provider onboarding (skills, availability, service area).

CREATE TABLE IF NOT EXISTS catalog_categories (
    id varchar(40) PRIMARY KEY,
    name varchar(60) NOT NULL,
    icon varchar(40) NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_skills (
    id varchar(60) PRIMARY KEY,
    category_id varchar(40) NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
    name varchar(80) NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_catalog_skills_category_id ON catalog_skills (category_id);

CREATE TABLE IF NOT EXISTS provider_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
    onboarding_status varchar(20) NOT NULL DEFAULT 'skills'
        CHECK (onboarding_status IN ('skills', 'service_setup', 'complete')),
    latitude numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(9, 6) CHECK (longitude BETWEEN -180 AND 180),
    pincode char(6) CHECK (pincode ~ '^[1-9][0-9]{5}$'),
    area_name varchar(80),
    radius_km smallint CHECK (radius_km BETWEEN 1 AND 50),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE TABLE IF NOT EXISTS provider_skills (
    user_id uuid NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
    skill_id varchar(60) NOT NULL REFERENCES catalog_skills(id) ON DELETE RESTRICT,
    proficiency varchar(12) NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'expert')),
    years_experience smallint CHECK (years_experience BETWEEN 0 AND 60),
    PRIMARY KEY (user_id, skill_id)
);
-- Future job matching looks providers up by skill.
CREATE INDEX IF NOT EXISTS ix_provider_skills_skill_id ON provider_skills (skill_id);

CREATE TABLE IF NOT EXISTS provider_availability (
    user_id uuid NOT NULL REFERENCES provider_profiles(user_id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    PRIMARY KEY (user_id, day_of_week),
    CHECK (start_time < end_time)
);

ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE catalog_categories, catalog_skills, provider_profiles, provider_skills, provider_availability
    FROM anon, authenticated;

-- Seed: category ids match the frontend's landing page categories.
INSERT INTO catalog_categories (id, name, icon, sort_order) VALUES
    ('plumbing', 'Plumbing', 'wrench', 1),
    ('electrical', 'Electrical', 'zap', 2),
    ('cleaning', 'Cleaning', 'sparkles', 3),
    ('painting', 'Painting', 'paint', 4),
    ('ac', 'AC Repair', 'snowflake', 5),
    ('carpentry', 'Carpentry', 'hammer', 6),
    ('moving', 'Moving', 'truck', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO catalog_skills (id, category_id, name, sort_order) VALUES
    ('plumbing-tap-leak', 'plumbing', 'Tap & leak repair', 1),
    ('plumbing-pipe-blockage', 'plumbing', 'Pipe fitting & blockage', 2),
    ('plumbing-bathroom-fittings', 'plumbing', 'Bathroom fittings', 3),
    ('plumbing-water-tank', 'plumbing', 'Water tank cleaning', 4),
    ('electrical-wiring', 'electrical', 'Wiring & switchboards', 1),
    ('electrical-fan-light', 'electrical', 'Fan & light installation', 2),
    ('electrical-inverter', 'electrical', 'Inverter & battery', 3),
    ('electrical-appliance', 'electrical', 'Appliance repair', 4),
    ('cleaning-deep-home', 'cleaning', 'Deep home cleaning', 1),
    ('cleaning-bathroom', 'cleaning', 'Bathroom cleaning', 2),
    ('cleaning-kitchen', 'cleaning', 'Kitchen cleaning', 3),
    ('cleaning-sofa-carpet', 'cleaning', 'Sofa & carpet cleaning', 4),
    ('painting-interior', 'painting', 'Interior painting', 1),
    ('painting-exterior', 'painting', 'Exterior painting', 2),
    ('painting-waterproofing', 'painting', 'Waterproofing', 3),
    ('painting-wood-polish', 'painting', 'Wood polish', 4),
    ('ac-service', 'ac', 'AC service', 1),
    ('ac-installation', 'ac', 'AC installation & uninstall', 2),
    ('ac-gas-refill', 'ac', 'Gas refill', 3),
    ('ac-fridge-repair', 'ac', 'Refrigerator repair', 4),
    ('carpentry-furniture-assembly', 'carpentry', 'Furniture assembly', 1),
    ('carpentry-door-window', 'carpentry', 'Door & window repair', 2),
    ('carpentry-modular-kitchen', 'carpentry', 'Modular kitchen', 3),
    ('carpentry-custom-furniture', 'carpentry', 'Custom furniture', 4),
    ('moving-home-shifting', 'moving', 'Home shifting', 1),
    ('moving-packing', 'moving', 'Packing & unpacking', 2),
    ('moving-mini-truck', 'moving', 'Mini truck transport', 3),
    ('moving-loading-labour', 'moving', 'Loading & unloading', 4)
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;
