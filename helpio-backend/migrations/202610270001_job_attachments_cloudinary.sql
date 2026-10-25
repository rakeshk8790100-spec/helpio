-- Job photos and videos move to Cloudinary: store the delivery URL and the Cloudinary id instead of a Storage path.
-- The table was empty when Storage was replaced, so rows without a URL are removed rather than migrated.

DELETE FROM job_attachments WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_attachments' AND column_name = 'url'
);

ALTER TABLE job_attachments
    ADD COLUMN IF NOT EXISTS url text,
    ADD COLUMN IF NOT EXISTS public_id varchar(200),
    ADD COLUMN IF NOT EXISTS resource_type varchar(10);
ALTER TABLE job_attachments DROP COLUMN IF EXISTS storage_path;

ALTER TABLE job_attachments ALTER COLUMN url SET NOT NULL;
ALTER TABLE job_attachments ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE job_attachments ALTER COLUMN resource_type SET NOT NULL;
ALTER TABLE job_attachments DROP CONSTRAINT IF EXISTS job_attachments_public_id_key;
ALTER TABLE job_attachments ADD CONSTRAINT job_attachments_public_id_key UNIQUE (public_id);
ALTER TABLE job_attachments DROP CONSTRAINT IF EXISTS job_attachments_resource_type_check;
ALTER TABLE job_attachments
    ADD CONSTRAINT job_attachments_resource_type_check CHECK (resource_type IN ('image', 'video'));
