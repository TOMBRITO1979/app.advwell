-- Migration: Add lawyerId to cases table
-- Date: 2026-01-08
-- Description: Adds lawyer responsible field to cases

-- Add lawyerId column
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "lawyerId" TEXT;

-- Add foreign key constraint
ALTER TABLE cases
ADD CONSTRAINT cases_lawyer_id_fkey
FOREIGN KEY ("lawyerId") REFERENCES lawyers(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cases_lawyer ON cases("lawyerId");

-- Comment
COMMENT ON COLUMN cases."lawyerId" IS 'ID do advogado responsavel pelo processo';
