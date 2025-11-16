-- Add googleMeetLink column to schedule_events table
-- Migration: add_google_meet_link
-- Date: 2025-11-16

-- Add column for Google Meet calendar link
ALTER TABLE schedule_events ADD COLUMN IF NOT EXISTS "googleMeetLink" TEXT;

-- Add comment
COMMENT ON COLUMN schedule_events."googleMeetLink" IS 'Link do Google Calendar para criar reunião com Google Meet';
