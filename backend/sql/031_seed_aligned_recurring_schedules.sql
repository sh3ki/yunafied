-- Give active teachers usable weekly availability and fill missing active
-- enrollment class schedules without creating teacher conflicts.

-- Standard availability: weekdays, morning and afternoon windows.
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_active)
SELECT t.id, slots.day_of_week, slots.start_time::time, slots.end_time::time, TRUE
  FROM users t
 CROSS JOIN (VALUES
   (1, '09:00', '12:00'), (1, '14:00', '17:00'),
   (2, '09:00', '12:00'), (2, '14:00', '17:00'),
   (3, '09:00', '12:00'), (3, '14:00', '17:00'),
   (4, '09:00', '12:00'), (4, '14:00', '17:00'),
   (5, '09:00', '12:00'), (5, '14:00', '17:00')
 ) AS slots(day_of_week, start_time, end_time)
 WHERE t.role = 'teacher' AND t.status = 'active'
   AND NOT EXISTS (
     SELECT 1 FROM teacher_availability ta
      WHERE ta.teacher_id = t.id
        AND ta.day_of_week = slots.day_of_week
        AND ta.start_time <= slots.start_time::time
        AND ta.end_time >= slots.end_time::time
        AND ta.is_active = TRUE
   );

-- Remove availability rows fully contained by a larger availability window.
DELETE FROM teacher_availability smaller
 WHERE EXISTS (
   SELECT 1
     FROM teacher_availability larger
    WHERE larger.id <> smaller.id
      AND larger.teacher_id = smaller.teacher_id
      AND larger.day_of_week = smaller.day_of_week
      AND larger.start_time <= smaller.start_time
      AND larger.end_time >= smaller.end_time
      AND larger.is_active = TRUE
      AND smaller.is_active = TRUE
 );

DO $$
DECLARE
  enrollment RECORD;
  candidate RECORD;
BEGIN
  FOR enrollment IN
    SELECT e.id, e.teacher_id
      FROM enrollment_records e
     WHERE e.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM enrollment_class_schedules ecs WHERE ecs.enrollment_id = e.id
       )
     ORDER BY e.teacher_id, e.created_at, e.id
  LOOP
    SELECT slots.day_of_week, slots.start_time::time AS start_time, slots.end_time::time AS end_time
      INTO candidate
      FROM (VALUES
        (1, '09:00', '10:00'), (1, '10:00', '11:00'), (1, '11:00', '12:00'),
        (1, '14:00', '15:00'), (1, '15:00', '16:00'), (1, '16:00', '17:00'),
        (2, '09:00', '10:00'), (2, '10:00', '11:00'), (2, '11:00', '12:00'),
        (2, '14:00', '15:00'), (2, '15:00', '16:00'), (2, '16:00', '17:00'),
        (3, '09:00', '10:00'), (3, '10:00', '11:00'), (3, '11:00', '12:00'),
        (3, '14:00', '15:00'), (3, '15:00', '16:00'), (3, '16:00', '17:00'),
        (4, '09:00', '10:00'), (4, '10:00', '11:00'), (4, '11:00', '12:00'),
        (4, '14:00', '15:00'), (4, '15:00', '16:00'), (4, '16:00', '17:00'),
        (5, '09:00', '10:00'), (5, '10:00', '11:00'), (5, '11:00', '12:00'),
        (5, '14:00', '15:00'), (5, '15:00', '16:00'), (5, '16:00', '17:00')
      ) AS slots(day_of_week, start_time, end_time)
     WHERE NOT EXISTS (
       SELECT 1
         FROM enrollment_class_schedules occupied
         JOIN enrollment_records occupied_enrollment ON occupied_enrollment.id = occupied.enrollment_id
        WHERE occupied_enrollment.teacher_id = enrollment.teacher_id
          AND occupied.day_of_week = slots.day_of_week
          AND occupied.start_time < slots.end_time::time
          AND occupied.end_time > slots.start_time::time
     )
     ORDER BY slots.day_of_week, slots.start_time
     LIMIT 1;

    IF candidate.day_of_week IS NOT NULL THEN
      INSERT INTO enrollment_class_schedules (enrollment_id, day_of_week, start_time, end_time)
      VALUES (enrollment.id, candidate.day_of_week, candidate.start_time, candidate.end_time);
    END IF;
  END LOOP;
END $$;
