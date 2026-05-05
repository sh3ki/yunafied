-- Migration 016: Gamification expansion (badges, XP, vocabulary)

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO badges (code, name, description, icon) VALUES
  ('FIRST_QUIZ', 'First Step', 'Completed your first quiz', 'star'),
  ('PERFECT_SCORE', 'Perfect Score', 'Got 100% on a quiz', 'trophy'),
  ('SPEED_DEMON', 'Speed Demon', 'Finished a quiz in under half the time limit', 'zap'),
  ('QUIZ_STREAK_3', 'On a Roll', 'Completed quizzes 3 days in a row', 'flame'),
  ('CATEGORY_MASTER', 'Category Master', 'Completed all quizzes in a category', 'award'),
  ('SCORE_1000', 'Point Collector', 'Earned 1,000 total XP points', 'coins'),
  ('SCORE_5000', 'High Scorer', 'Earned 5,000 total XP points', 'medal')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);

CREATE TABLE IF NOT EXISTS student_xp (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Learner',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_user ON user_vocabulary(user_id, created_at DESC);
