-- Customer favourite services (catalog skills), picked a few at a time from a popup after each sign-in.

CREATE TABLE IF NOT EXISTS customer_favorite_skills (
    user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    skill_id varchar(60) NOT NULL REFERENCES catalog_skills(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

-- Popups skipped in a row; the popup stops after 3 (saving resets it). Kept apart so auth_users stays generic.
CREATE TABLE IF NOT EXISTS customer_favorite_prompts (
    user_id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
    skip_streak integer NOT NULL DEFAULT 0 CHECK (skip_streak >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customer_favorite_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorite_prompts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE customer_favorite_skills, customer_favorite_prompts FROM anon, authenticated;
