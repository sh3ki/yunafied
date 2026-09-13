-- Migration 032: Gamified Arcade foundation
-- Keeps the legacy gamified_quizzes tables intact while adding the extensible arcade model.

DO $$ BEGIN
  CREATE TYPE gamified_game_type AS ENUM ('speed_run', 'match_master', 'word_builder', 'memory_flip', 'boss_battle', 'quest_adventure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gamified_game_mode AS ENUM ('practice', 'assessed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gamified_game_visibility AS ENUM ('all_students', 'assigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS gamified_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  game_type gamified_game_type NOT NULL,
  category_id UUID REFERENCES gamified_categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  cover_image_url TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 5 CHECK (estimated_minutes BETWEEN 1 AND 180),
  practice_xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (practice_xp_reward >= 0),
  practice_coin_reward INTEGER NOT NULL DEFAULT 10 CHECK (practice_coin_reward >= 0),
  assessed_xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (assessed_xp_reward >= 0),
  assessed_coin_reward INTEGER NOT NULL DEFAULT 0 CHECK (assessed_coin_reward >= 0),
  visibility gamified_game_visibility NOT NULL DEFAULT 'all_students',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  power_ups_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gamified_game_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, student_id)
);

CREATE TABLE IF NOT EXISTS gamified_speed_run_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL, question_order INTEGER NOT NULL, points INTEGER NOT NULL DEFAULT 100,
  time_limit_seconds INTEGER NOT NULL DEFAULT 20 CHECK (time_limit_seconds BETWEEN 5 AND 300), UNIQUE(game_id, question_order)
);
CREATE TABLE IF NOT EXISTS gamified_speed_run_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), question_id UUID NOT NULL REFERENCES gamified_speed_run_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL, choice_order INTEGER NOT NULL, is_correct BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(question_id, choice_order)
);

CREATE TABLE IF NOT EXISTS gamified_match_master_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  left_text TEXT NOT NULL, right_text TEXT NOT NULL, pair_order INTEGER NOT NULL, UNIQUE(game_id, pair_order)
);

CREATE TABLE IF NOT EXISTS gamified_word_builder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL, answer TEXT NOT NULL, hint TEXT, challenge_order INTEGER NOT NULL, points INTEGER NOT NULL DEFAULT 100,
  UNIQUE(game_id, challenge_order)
);

CREATE TABLE IF NOT EXISTS gamified_memory_flip_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  pair_key TEXT NOT NULL, card_text TEXT NOT NULL, card_kind TEXT NOT NULL CHECK(card_kind IN ('term', 'match')), card_order INTEGER NOT NULL,
  UNIQUE(game_id, card_order)
);

CREATE TABLE IF NOT EXISTS gamified_boss_battle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL, title TEXT NOT NULL, boss_health INTEGER NOT NULL DEFAULT 100 CHECK(boss_health > 0),
  UNIQUE(game_id, stage_order)
);
CREATE TABLE IF NOT EXISTS gamified_boss_battle_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stage_id UUID NOT NULL REFERENCES gamified_boss_battle_stages(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL, question_order INTEGER NOT NULL, points INTEGER NOT NULL DEFAULT 100,
  answer TEXT NOT NULL, UNIQUE(stage_id, question_order)
);

CREATE TABLE IF NOT EXISTS gamified_quest_adventure_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  node_order INTEGER NOT NULL, title TEXT NOT NULL, story_text TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL, answer TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 100, UNIQUE(game_id, node_order)
);

CREATE TABLE IF NOT EXISTS gamified_game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES gamified_games(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, mode gamified_game_mode NOT NULL DEFAULT 'practice',
  attempt_number INTEGER NOT NULL CHECK(attempt_number > 0), score INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0),
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK(accuracy BETWEEN 0 AND 100), xp_earned INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0, duration_seconds INTEGER NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, student_id, mode, attempt_number)
);

CREATE TABLE IF NOT EXISTS gamified_game_attempt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id UUID NOT NULL REFERENCES gamified_game_attempts(id) ON DELETE CASCADE,
  content_id UUID, event_type TEXT NOT NULL, response JSONB NOT NULL DEFAULT '{}'::jsonb, is_correct BOOLEAN,
  points_earned INTEGER NOT NULL DEFAULT 0, power_up_code TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_progression (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, level_number INTEGER NOT NULL DEFAULT 1 CHECK(level_number > 0),
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK(total_xp >= 0), current_level_xp INTEGER NOT NULL DEFAULT 0 CHECK(current_level_xp >= 0),
  coin_balance INTEGER NOT NULL DEFAULT 0 CHECK(coin_balance >= 0), current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0, last_activity_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS student_coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, transaction_type TEXT NOT NULL, reference_type TEXT, reference_id UUID, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_item_id UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE, quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, store_item_id)
);

ALTER TABLE store_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'power_up';
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS effect_config JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS coin_cost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_gamified_games_type ON gamified_games(game_type, is_published);
CREATE INDEX IF NOT EXISTS idx_gamified_games_category ON gamified_games(category_id, is_published);
CREATE INDEX IF NOT EXISTS idx_gamified_assignments_student ON gamified_game_assignments(student_id, game_id);
CREATE INDEX IF NOT EXISTS idx_gamified_attempts_leaderboard ON gamified_game_attempts(game_id, score DESC, completed_at ASC);
CREATE INDEX IF NOT EXISTS idx_gamified_attempts_type ON gamified_game_attempts(mode, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_student ON student_coin_transactions(student_id, created_at DESC);

UPDATE store_items SET coin_cost = CASE code WHEN '50_50' THEN 25 WHEN 'skip_q' THEN 40 ELSE coin_cost END WHERE coin_cost = 0;
