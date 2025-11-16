-- Migration: Add account lockout fields to users table
-- Purpose: Track failed login attempts and implement account lockout after 5 failures
-- Date: 2025-11-15

-- Add columns for account lockout
ALTER TABLE users
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "accountLockedUntil" TIMESTAMP;

-- Add comment to explain the fields
COMMENT ON COLUMN users."failedLoginAttempts" IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users."lastFailedLoginAt" IS 'Timestamp of the last failed login attempt';
COMMENT ON COLUMN users."accountLockedUntil" IS 'Timestamp until which the account is locked (NULL if not locked)';

-- Create index for performance on account locked queries
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users("accountLockedUntil") WHERE "accountLockedUntil" IS NOT NULL;
