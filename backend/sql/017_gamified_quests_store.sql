-- Migration 017: Gamified quests and store

CREATE TABLE IF NOT EXISTS student_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 50,
  reward_badge_code TEXT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_student_quests_student ON student_quests(student_id);

CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 100,
  is_consumable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_store_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_store_purchases_student ON student_store_purchases(student_id);

-- Insert a couple default store items
INSERT INTO store_items (code, name, description, xp_cost, is_consumable)
VALUES
  ('50_50', '50/50 Hint', 'Eliminate two wrong choices for one question (consumable).', 200, TRUE),
  ('skip_q', 'Skip Question', 'Skip a single question without penalty (consumable).', 350, TRUE)
ON CONFLICT (code) DO NOTHING;
