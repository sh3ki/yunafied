-- Migration 018: Add rubric file columns to assignments
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS rubric_file_name TEXT,
  ADD COLUMN IF NOT EXISTS rubric_url TEXT;
