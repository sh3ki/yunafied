-- Preserve class/tutorial assignments for audit history instead of deleting them.
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'archived';
