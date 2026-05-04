-- 010_chat_read_tracking.sql
-- Adds last_read_at to chat_participants so we can compute per-user unread message counts.

ALTER TABLE chat_participants
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chat_participants_last_read
  ON chat_participants (user_id, last_read_at);
