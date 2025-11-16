-- Migration: Add lastAcknowledgedAt field to cases table
-- Purpose: Track when lawyer acknowledged case updates (for "Atualizações" feature)
-- Date: 2025-11-07

-- Add the new field
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS "lastAcknowledgedAt" TIMESTAMP(3);

-- Add comment to document the field
COMMENT ON COLUMN cases."lastAcknowledgedAt" IS 'Última vez que o advogado marcou como "ciente" das atualizações do processo';

-- Index for efficient queries (finding cases with pending updates)
CREATE INDEX IF NOT EXISTS "cases_updates_pending_idx"
ON cases ("lastSyncedAt", "lastAcknowledgedAt")
WHERE "lastSyncedAt" IS NOT NULL;
