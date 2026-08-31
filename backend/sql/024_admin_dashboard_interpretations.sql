CREATE TABLE IF NOT EXISTS admin_dashboard_interpretations (
  fingerprint TEXT PRIMARY KEY,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL,
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_dashboard_interpretations_created
  ON admin_dashboard_interpretations(created_at DESC);
