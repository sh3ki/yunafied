-- Meeting rooms for WebRTC video calls between teachers and students
CREATE TABLE IF NOT EXISTS meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_token VARCHAR(64) UNIQUE NOT NULL,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  student_name TEXT,
  schedule_title TEXT,
  status TEXT NOT NULL DEFAULT 'calling'
    CHECK (status IN ('calling', 'active', 'declined', 'ended')),
  offer JSONB,
  answer JSONB,
  teacher_ice_candidates JSONB NOT NULL DEFAULT '[]',
  student_ice_candidates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_student_calling
  ON meeting_rooms(student_id, status)
  WHERE status = 'calling';

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_token
  ON meeting_rooms(room_token);

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_teacher
  ON meeting_rooms(teacher_id);
