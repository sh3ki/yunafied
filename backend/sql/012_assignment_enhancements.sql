-- Assignment enhancements: teacher file attachment + close/open toggle
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_file_name TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE;
