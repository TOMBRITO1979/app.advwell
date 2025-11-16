-- Add GOOGLE_MEET to ScheduleEventType enum
-- Migration: add_google_meet_type
-- Date: 2025-11-16

-- Add new enum value
ALTER TYPE "ScheduleEventType" ADD VALUE IF NOT EXISTS 'GOOGLE_MEET';
