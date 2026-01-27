-- Add DAYS_7 to RecurrencePeriod enum
-- Migration: add_days7_to_recurrence_period
-- Date: 2026-01-27

-- Add new value to existing enum
ALTER TYPE "RecurrencePeriod" ADD VALUE IF NOT EXISTS 'DAYS_7' BEFORE 'DAYS_15';

-- Update comment
COMMENT ON COLUMN accounts_payable."recurrencePeriod" IS 'Período de recorrência: DAYS_7, DAYS_15, DAYS_30, MONTHS_6, YEAR_1';
