-- 011_meeting_rooms_description.sql
-- Adds schedule_description to meeting_rooms so the video call can display it.

ALTER TABLE meeting_rooms
  ADD COLUMN IF NOT EXISTS schedule_description TEXT;
