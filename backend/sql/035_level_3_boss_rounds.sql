-- Level 3 has a seven-round Big Boss fight.
ALTER TABLE cycling_quest_runs
  DROP CONSTRAINT IF EXISTS cycling_quest_runs_boss_correct_count_check;

ALTER TABLE cycling_quest_runs
  ADD CONSTRAINT cycling_quest_runs_boss_correct_count_check
  CHECK (boss_correct_count BETWEEN 0 AND 7);
