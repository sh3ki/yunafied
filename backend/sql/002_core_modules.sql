ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users
   SET full_name = COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1))
 WHERE full_name IS NULL OR full_name = '';

ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS day_of_week TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'schedules' AND column_name = 'day'
  ) THEN
    UPDATE schedules
       SET day_of_week = COALESCE(day_of_week, day)
     WHERE day IS NOT NULL;
    ALTER TABLE schedules DROP COLUMN IF EXISTS day;
  END IF;
END $$;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS grade_value TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'submissions_assignment_student_unique'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_assignment_student_unique UNIQUE (assignment_id, student_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
