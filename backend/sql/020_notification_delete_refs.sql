-- Migration 020: Notification delete refs for dismissed synthetic notifications

-- Track individual deleted/dismissed refs for synthetic (dynamically-generated) notifications
CREATE TABLE IF NOT EXISTS notification_delete_refs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ref)
);
