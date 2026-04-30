DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS enrollment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  tutorial_group TEXT,
  status enrollment_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enrollments_unique_pair UNIQUE (student_id, teacher_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollment_records(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_teacher ON enrollment_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_status ON enrollment_records(status);

CREATE TABLE IF NOT EXISTS learning_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('link', 'file')),
  resource_url TEXT NOT NULL,
  file_name TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_subject ON learning_materials(subject);
CREATE INDEX IF NOT EXISTS idx_materials_creator ON learning_materials(created_by_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON learning_materials(created_at DESC);
