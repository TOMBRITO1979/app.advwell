-- Add reminder fields to AccountPayable
-- Migration: add_reminder_fields_accounts_payable
-- Date: 2026-01-27

-- Add lastReminderAt field
ALTER TABLE accounts_payable
ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP;

-- Add reminderCount field with default value
ALTER TABLE accounts_payable
ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER DEFAULT 0;

-- Add index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_accounts_payable_reminder
ON accounts_payable ("companyId", "status", "dueDate", "lastReminderAt")
WHERE status = 'PENDING';

-- Comment
COMMENT ON COLUMN accounts_payable."lastReminderAt" IS 'Última vez que lembrete foi enviado';
COMMENT ON COLUMN accounts_payable."reminderCount" IS 'Contador de lembretes enviados';
