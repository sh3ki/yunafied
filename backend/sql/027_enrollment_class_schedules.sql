CREATE TABLE IF NOT EXISTS enrollment_class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollment_records(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrollment_class_schedule_valid_time CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_class_schedules_enrollment
  ON enrollment_class_schedules(enrollment_id, day_of_week, start_time);
