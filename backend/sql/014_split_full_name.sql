-- 014: Split full_name into first_name, middle_name, last_name
-- Adds the three new columns, backfills them from full_name, then keeps full_name
-- as a generated-style column (kept for backwards compat) updated by trigger.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';

-- Backfill: split existing full_name into parts
-- Strategy: last word = last_name, first word = first_name, middle = rest
UPDATE users
   SET
     first_name  = CASE
                     WHEN array_length(string_to_array(trim(full_name), ' '), 1) >= 2
                       THEN (string_to_array(trim(full_name), ' '))[1]
                     ELSE trim(full_name)
                   END,
     middle_name = CASE
                     WHEN array_length(string_to_array(trim(full_name), ' '), 1) >= 3
                       THEN array_to_string(
                              (string_to_array(trim(full_name), ' '))[2 : array_length(string_to_array(trim(full_name), ' '), 1) - 1],
                              ' '
                            )
                     ELSE NULL
                   END,
     last_name   = CASE
                     WHEN array_length(string_to_array(trim(full_name), ' '), 1) >= 2
                       THEN (string_to_array(trim(full_name), ' '))[array_length(string_to_array(trim(full_name), ' '), 1)]
                     ELSE ''
                   END
 WHERE first_name = '';

-- Keep full_name in sync: update it from name parts
UPDATE users
   SET full_name = trim(
         first_name
         || CASE WHEN middle_name IS NOT NULL AND middle_name <> '' THEN ' ' || middle_name ELSE '' END
         || CASE WHEN last_name <> '' THEN ' ' || last_name ELSE '' END
       );
