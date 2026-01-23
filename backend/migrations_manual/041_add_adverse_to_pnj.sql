-- Migration: Add adverseId to PNJ table
-- Date: 2026-01-23
-- Description: Adds the adverseId field to PNJs to link to Adverse party

-- Drop the column if it exists with wrong type
ALTER TABLE "pnjs" DROP COLUMN IF EXISTS "adverseId";

-- Add adverseId column to pnjs table (TEXT type to match adverses.id)
ALTER TABLE "pnjs" ADD COLUMN "adverseId" TEXT;

-- Add foreign key constraint
ALTER TABLE "pnjs"
DROP CONSTRAINT IF EXISTS "pnjs_adverseId_fkey";

ALTER TABLE "pnjs"
ADD CONSTRAINT "pnjs_adverseId_fkey"
FOREIGN KEY ("adverseId") REFERENCES "adverses"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for adverseId
DROP INDEX IF EXISTS "pnjs_adverseId_idx";
CREATE INDEX "pnjs_adverseId_idx" ON "pnjs"("adverseId");

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pnjs' AND column_name = 'adverseId';
