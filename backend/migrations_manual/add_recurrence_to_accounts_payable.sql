-- Add recurrence functionality to accounts payable
-- Migration: add_recurrence_to_accounts_payable
-- Date: 2025-11-16

-- Create enum for recurrence periods
CREATE TYPE "RecurrencePeriod" AS ENUM ('DAYS_15', 'DAYS_30', 'MONTHS_6', 'YEAR_1');

-- Add recurrence columns to accounts_payable table
ALTER TABLE accounts_payable
  ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recurrencePeriod" "RecurrencePeriod",
  ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add index for better performance on recurrence queries
CREATE INDEX IF NOT EXISTS "accounts_payable_isRecurring_idx" ON accounts_payable("isRecurring");
CREATE INDEX IF NOT EXISTS "accounts_payable_parentId_idx" ON accounts_payable("parentId");

-- Add comments
COMMENT ON COLUMN accounts_payable."isRecurring" IS 'Indica se a conta é recorrente';
COMMENT ON COLUMN accounts_payable."recurrencePeriod" IS 'Período de recorrência: DAYS_15, DAYS_30, MONTHS_6, YEAR_1';
COMMENT ON COLUMN accounts_payable."parentId" IS 'ID da conta original que gerou esta recorrência';
