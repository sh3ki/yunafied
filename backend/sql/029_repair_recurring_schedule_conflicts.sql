-- Repair recurring schedules so active class slots assigned to the same teacher
-- never overlap, and teacher availability covers every repaired class slot.

CREATE TABLE IF NOT EXISTS _schedule_windows (
  teacher_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
TRUNCATE _schedule_windows;

INSERT INTO _schedule_windows (teacher_id, day_of_week, start_time, end_time)
SELECT teacher_id, day_of_week, start_time, end_time
  FROM teacher_availability
 WHERE is_active = TRUE;

INSERT INTO _schedule_windows (teacher_id, day_of_week, start_time, end_time)
SELECT e.teacher_id, ecs.day_of_week, ecs.start_time, ecs.end_time
  FROM enrollment_records e
  JOIN enrollment_class_schedules ecs ON ecs.enrollment_id = e.id
 WHERE e.status = 'active';

-- Rebuild availability as non-overlapping merged windows.
TRUNCATE teacher_availability;
WITH ordered AS (
  SELECT teacher_id, day_of_week, start_time, end_time,
         MAX(end_time) OVER (
           PARTITION BY teacher_id, day_of_week
           ORDER BY start_time, end_time
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS previous_end
    FROM _schedule_windows
), marked AS (
  SELECT *, CASE WHEN previous_end IS NULL OR start_time > previous_end THEN 1 ELSE 0 END AS new_group
    FROM ordered
), numbered AS (
  SELECT *, SUM(new_group) OVER (
    PARTITION BY teacher_id, day_of_week
    ORDER BY start_time, end_time
    ROWS UNBOUNDED PRECEDING
  ) AS group_id
    FROM marked
), grouped AS (
  SELECT teacher_id, day_of_week, group_id, MIN(start_time) AS start_time, MAX(end_time) AS end_time
    FROM numbered
   GROUP BY teacher_id, day_of_week, group_id
)
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_active)
SELECT teacher_id, day_of_week, start_time, end_time, TRUE
  FROM grouped
;

-- Remove exact duplicate class slots before resolving actual overlaps.
DELETE FROM enrollment_class_schedules duplicate_slot
 WHERE duplicate_slot.id IN (
   SELECT id FROM (
     SELECT id, ROW_NUMBER() OVER (
       PARTITION BY enrollment_id, day_of_week, start_time, end_time
       ORDER BY created_at, id
     ) AS row_number
     FROM enrollment_class_schedules
   ) ranked
   WHERE ranked.row_number > 1
 );

CREATE TABLE IF NOT EXISTS _placed_class_slots (
  teacher_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
TRUNCATE _placed_class_slots;

DO $$
DECLARE
  slot RECORD;
  window_slot RECORD;
  blocking_end TIME;
  candidate_start TIME;
  candidate_day SMALLINT;
  duration INTERVAL;
  placed BOOLEAN;
  day_offset INTEGER;
BEGIN
  FOR slot IN
    SELECT ecs.id, e.teacher_id, ecs.day_of_week, ecs.start_time, ecs.end_time,
           e.created_at, e.updated_at
      FROM enrollment_class_schedules ecs
      JOIN enrollment_records e ON e.id = ecs.enrollment_id
     WHERE e.status = 'active'
     ORDER BY e.created_at, e.updated_at, ecs.created_at, ecs.id
  LOOP
    duration := slot.end_time - slot.start_time;
    placed := FALSE;

    -- Preserve the original weekday first, then use the next available weekday
    -- only if the original day has no conflict-free window.
    FOR day_offset IN 0..6 LOOP
      candidate_day := (slot.day_of_week + day_offset) % 7;
      FOR window_slot IN
        SELECT start_time, end_time
          FROM teacher_availability
         WHERE teacher_id = slot.teacher_id
           AND day_of_week = candidate_day
           AND is_active = TRUE
         ORDER BY start_time
      LOOP
        candidate_start := CASE WHEN day_offset = 0 THEN GREATEST(window_slot.start_time, slot.start_time) ELSE window_slot.start_time END;

        LOOP
          IF candidate_start + duration > window_slot.end_time THEN
            EXIT;
          END IF;

          SELECT MAX(end_time) INTO blocking_end
            FROM _placed_class_slots
           WHERE teacher_id = slot.teacher_id
             AND day_of_week = candidate_day
             AND start_time < candidate_start + duration
             AND end_time > candidate_start;

          IF blocking_end IS NULL THEN
            UPDATE enrollment_class_schedules
               SET day_of_week = candidate_day,
                   start_time = candidate_start,
                   end_time = candidate_start + duration
             WHERE id = slot.id;

            INSERT INTO _placed_class_slots VALUES (slot.teacher_id, candidate_day, candidate_start, candidate_start + duration);
            placed := TRUE;
            EXIT;
          END IF;

          candidate_start := blocking_end;
        END LOOP;

        EXIT WHEN placed;
      END LOOP;

      EXIT WHEN placed;
    END LOOP;

    -- If no window exists, retain the original slot for manual review rather
    -- than deleting a class assignment.
    IF NOT placed THEN
      INSERT INTO _placed_class_slots VALUES (slot.teacher_id, slot.day_of_week, slot.start_time, slot.end_time);
    END IF;
  END LOOP;
END $$;

-- Add any repaired slots that fall outside the rebuilt availability.
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_active)
SELECT DISTINCT e.teacher_id, ecs.day_of_week, ecs.start_time, ecs.end_time, TRUE
  FROM enrollment_records e
  JOIN enrollment_class_schedules ecs ON ecs.enrollment_id = e.id
 WHERE e.status = 'active'
   AND NOT EXISTS (
     SELECT 1 FROM teacher_availability ta
      WHERE ta.teacher_id = e.teacher_id
        AND ta.day_of_week = ecs.day_of_week
        AND ta.start_time <= ecs.start_time
        AND ta.end_time >= ecs.end_time
        AND ta.is_active = TRUE
   );

DROP TABLE IF EXISTS _placed_class_slots;
DROP TABLE IF EXISTS _schedule_windows;
