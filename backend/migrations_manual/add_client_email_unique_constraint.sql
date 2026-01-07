-- Migration: Add unique constraint on client email per company
-- Date: 2026-01-07
-- Description: Prevents duplicate emails for clients within the same company
--              NULL emails are still allowed (multiple clients without email)

-- Add unique constraint for email per company
-- PostgreSQL allows multiple NULL values in unique constraints by default
CREATE UNIQUE INDEX IF NOT EXISTS "clients_companyId_email_key"
ON clients ("companyId", email)
WHERE email IS NOT NULL;

-- Verify the constraint was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'clients' AND indexname = 'clients_companyId_email_key';
