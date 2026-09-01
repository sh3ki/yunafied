-- Link every video meeting schedule to the class/tutorial assignment that created it.
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollment_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_enrollment_id
  ON schedules(enrollment_id);

-- Existing accepted/pending requests are retained as ordinary scheduled meetings.
UPDATE schedules
   SET status = 'scheduled'
 WHERE status IN ('accepted', 'pending');

ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE schedules ADD CONSTRAINT schedules_status_check
  CHECK (status IN ('scheduled', 'cancelled', 'pending', 'accepted', 'declined'));

-- Ensure every active class slot is also represented in the assigned teacher's
-- recurring availability. Existing teacher availability is preserved.
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_active)
SELECT DISTINCT e.teacher_id, ecs.day_of_week, ecs.start_time, ecs.end_time, TRUE
  FROM enrollment_records e
  JOIN enrollment_class_schedules ecs ON ecs.enrollment_id = e.id
 WHERE e.status = 'active'
   AND NOT EXISTS (
     SELECT 1
       FROM teacher_availability ta
      WHERE ta.teacher_id = e.teacher_id
        AND ta.day_of_week = ecs.day_of_week
        AND ta.start_time <= ecs.start_time
        AND ta.end_time >= ecs.end_time
        AND ta.is_active = TRUE
   );
