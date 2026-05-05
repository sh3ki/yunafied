-- Migration 019: Notification read refs for synthetic notifications

-- Track individual reads for synthetic (dynamically-generated) notifications
CREATE TABLE IF NOT EXISTS notification_read_refs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ref)
);

-- Track "mark all as read" timestamp per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_all_read_at TIMESTAMPTZ;
