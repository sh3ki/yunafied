-- Status details and audit history for enrollment and account status changes.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'archived', 'completed', 'dropped'));

ALTER TABLE enrollment_records
  ADD COLUMN IF NOT EXISTS drop_reason TEXT,
  ADD COLUMN IF NOT EXISTS drop_date DATE,
  ADD COLUMN IF NOT EXISTS action_taken TEXT,
  ADD COLUMN IF NOT EXISTS pull_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_notes TEXT;

CREATE TABLE IF NOT EXISTS status_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'enrollment')),
  entity_id UUID NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  drop_date DATE,
  action_taken TEXT,
  pull_out_reason TEXT,
  notes TEXT,
  changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_change_history_entity
  ON status_change_history(entity_type, entity_id, created_at DESC);
