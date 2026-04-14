CREATE TABLE IF NOT EXISTS gamified_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_categories_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS gamified_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES gamified_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  time_per_question_seconds INT NOT NULL DEFAULT 20,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_quizzes_time_per_question_check CHECK (time_per_question_seconds BETWEEN 5 AND 120)
);

CREATE TABLE IF NOT EXISTS gamified_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES gamified_quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  question_order INT NOT NULL,
  points INT NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_questions_points_check CHECK (points > 0),
  CONSTRAINT gamified_questions_quiz_order_unique UNIQUE (quiz_id, question_order)
);

CREATE TABLE IF NOT EXISTS gamified_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES gamified_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  choice_order INT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_choices_question_order_unique UNIQUE (question_id, choice_order)
);

CREATE TABLE IF NOT EXISTS gamified_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES gamified_quizzes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES gamified_categories(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  total_score INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_attempts_total_questions_check CHECK (total_questions > 0),
  CONSTRAINT gamified_attempts_correct_answers_check CHECK (correct_answers >= 0),
  CONSTRAINT gamified_attempts_total_score_check CHECK (total_score >= 0)
);

CREATE TABLE IF NOT EXISTS gamified_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES gamified_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES gamified_questions(id) ON DELETE CASCADE,
  selected_choice_id UUID REFERENCES gamified_choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INT NOT NULL DEFAULT 0,
  time_remaining_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gamified_attempt_answers_points_earned_check CHECK (points_earned >= 0),
  CONSTRAINT gamified_attempt_answers_time_remaining_check CHECK (time_remaining_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_gamified_quizzes_category_id ON gamified_quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_gamified_questions_quiz_id ON gamified_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_gamified_choices_question_id ON gamified_choices(question_id);
CREATE INDEX IF NOT EXISTS idx_gamified_attempts_category_score ON gamified_attempts(category_id, total_score DESC, completed_at ASC);
CREATE INDEX IF NOT EXISTS idx_gamified_attempts_student ON gamified_attempts(student_id, completed_at DESC);
