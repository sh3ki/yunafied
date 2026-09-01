-- Allow the new admin-managed video meeting status.
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_status_check
  CHECK (status IN ('scheduled', 'cancelled', 'pending', 'accepted', 'declined'));

-- Normalize legacy request statuses so the current workflow only creates
-- ordinary scheduled meetings.
UPDATE schedules
   SET status = 'scheduled'
 WHERE status IN ('pending', 'accepted');
