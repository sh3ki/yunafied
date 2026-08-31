CREATE TABLE IF NOT EXISTS teacher_records (
  teacher_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mobile_number TEXT,
  professional_title TEXT,
  employment_status TEXT,
  education TEXT,
  certifications TEXT,
  years_experience INTEGER CHECK (years_experience IS NULL OR years_experience >= 0),
  specializations TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_records_specializations ON teacher_records USING GIN (specializations);
