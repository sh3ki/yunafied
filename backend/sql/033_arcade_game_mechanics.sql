-- Migration 033: fields needed to render mechanics without exposing answers
ALTER TABLE gamified_word_builder_challenges ADD COLUMN IF NOT EXISTS scrambled_letters TEXT NOT NULL DEFAULT '';
ALTER TABLE gamified_quest_adventure_nodes ADD COLUMN IF NOT EXISTS scene_key TEXT NOT NULL DEFAULT 'forest';
ALTER TABLE gamified_boss_battle_stages ADD COLUMN IF NOT EXISTS boss_name TEXT NOT NULL DEFAULT 'The Guardian';
