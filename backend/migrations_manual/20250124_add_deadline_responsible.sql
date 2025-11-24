-- Add deadline responsible field to cases table
-- Migration: add_deadline_responsible
-- Date: 2025-01-24

ALTER TABLE "cases"
ADD COLUMN "deadlineResponsibleId" TEXT;

-- Add foreign key constraint
ALTER TABLE "cases"
ADD CONSTRAINT "cases_deadlineResponsibleId_fkey"
FOREIGN KEY ("deadlineResponsibleId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "cases_deadlineResponsibleId_idx" ON "cases"("deadlineResponsibleId");
