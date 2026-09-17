-- Migration 034: durable state for the student cycling learning game.
-- The question bank is intentionally fixed in the frontend for the Level 1 launch;
-- this stores student-owned rewards and a reviewable completion history.
DO $$ BEGIN
  CREATE TYPE cycling_power_up AS ENUM ('skip', 'double');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS student_cycling_powerups (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  power_up cycling_power_up NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, power_up)
);

CREATE TABLE IF NOT EXISTS cycling_quest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  boss_correct_count INTEGER NOT NULL DEFAULT 0 CHECK (boss_correct_count BETWEEN 0 AND 5),
  coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycling_quest_runs_student ON cycling_quest_runs(student_id, completed_at DESC);
