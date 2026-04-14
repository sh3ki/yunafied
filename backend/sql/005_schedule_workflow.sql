ALTER TABLE schedules ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS request_note TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS response_note TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE schedules
   SET scheduled_date = CURRENT_DATE
 WHERE scheduled_date IS NULL;

ALTER TABLE schedules ALTER COLUMN scheduled_date SET NOT NULL;

UPDATE schedules
   SET status = 'accepted'
 WHERE status IS NULL OR status NOT IN ('pending', 'accepted', 'declined', 'cancelled');

UPDATE schedules
   SET day_of_week = trim(to_char(scheduled_date, 'FMDay'))
 WHERE scheduled_date IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'schedules_status_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_status_check
      CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'schedules_time_range_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_time_range_check
      CHECK (start_time < end_time);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedules_teacher_date_status
  ON schedules(teacher_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_schedules_student_id
  ON schedules(student_id);
