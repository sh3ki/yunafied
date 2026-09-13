-- Ensure saving the same source/target pair updates the existing vocabulary item.
-- Keep the newest item if older database rows contain duplicates.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, source_text, target_language
           ORDER BY created_at DESC, id DESC
         ) AS row_number
  FROM user_vocabulary
)
DELETE FROM user_vocabulary
WHERE id IN (SELECT id FROM duplicates WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS user_vocabulary_user_source_target_key
  ON user_vocabulary (user_id, source_text, target_language);
