-- When a posted job was last changed by its customer; pros who quoted earlier are told to re-check it.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS edited_at timestamptz;
