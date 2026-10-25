-- Job photos/videos: a private Supabase Storage bucket, reached only through signed URLs issued by the backend.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-attachments', 'job-attachments', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS job_attachments (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    storage_path varchar(200) NOT NULL UNIQUE,
    content_type varchar(20) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')),
    size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_job_attachments_job_id ON job_attachments (job_id);

ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE job_attachments FROM anon, authenticated;
