-- Add reminder fields to schedule_events table
-- Migration: add_reminder_fields_to_schedule_event
-- Date: 2026-01-27

-- Add reminderCount column with default 0
ALTER TABLE schedule_events
ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- Add lastReminderAt column (nullable)
ALTER TABLE schedule_events
ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);

-- Add index for reminder queries
CREATE INDEX IF NOT EXISTS "schedule_events_reminder_idx"
ON schedule_events ("type", "completed", "reminderCount", "date")
WHERE "type" IN ('PRAZO', 'TAREFA') AND "completed" = false;

-- Add comment
COMMENT ON COLUMN schedule_events."reminderCount" IS 'Contador de lembretes enviados para este evento';
COMMENT ON COLUMN schedule_events."lastReminderAt" IS 'Data/hora do último lembrete enviado';
