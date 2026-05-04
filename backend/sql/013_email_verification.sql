-- 013_email_verification.sql
-- Adds email OTP verification fields to users table.
-- New self-registered users will be unverified until they confirm the 6-digit OTP sent to their email.
-- Admin-created users are marked verified by default (they receive credentials from admin directly).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_code      TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;

-- Mark all existing users as verified so they are not locked out.
UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE;
