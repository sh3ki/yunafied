-- Controlled enrollment and account setup
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;

-- Existing users are retained and remain usable. New accounts can use pending;
-- archived is the user-management soft-delete state.
UPDATE users
   SET status = 'active'
 WHERE status IS NULL OR status NOT IN ('active', 'inactive', 'pending', 'archived');

-- The system has one designated Admin. This index prevents a second active Admin
-- while allowing historical/inactive records to remain retained.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_active_admin
  ON users (role)
 WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users (verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;
