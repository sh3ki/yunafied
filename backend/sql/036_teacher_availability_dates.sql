ALTER TABLE teacher_availability ADD COLUMN IF NOT EXISTS available_date DATE;
CREATE INDEX IF NOT EXISTS idx_teacher_availability_date ON teacher_availability(teacher_id, available_date) WHERE is_active = TRUE;
