-- Migration: Fix lawyers table column names and add affiliation
-- Date: 2026-01-08
-- Description: Renames snake_case columns to camelCase and adds affiliation field

-- Create affiliation enum
DO $$ BEGIN
    CREATE TYPE "LawyerAffiliation" AS ENUM ('ESCRITORIO', 'ADVERSO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rename columns to camelCase (Prisma default)
ALTER TABLE lawyers RENAME COLUMN company_id TO "companyId";
ALTER TABLE lawyers RENAME COLUMN created_at TO "createdAt";
ALTER TABLE lawyers RENAME COLUMN updated_at TO "updatedAt";

-- Add affiliation column
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS affiliation "LawyerAffiliation" NOT NULL DEFAULT 'ESCRITORIO';

-- Update indexes with new column names
DROP INDEX IF EXISTS idx_lawyers_company_id;
DROP INDEX IF EXISTS idx_lawyers_company_oab;
DROP INDEX IF EXISTS idx_lawyers_company_created;

CREATE INDEX IF NOT EXISTS idx_lawyers_companyId ON lawyers("companyId");
CREATE INDEX IF NOT EXISTS idx_lawyers_companyId_oab ON lawyers("companyId", oab);
CREATE INDEX IF NOT EXISTS idx_lawyers_companyId_created ON lawyers("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_lawyers_affiliation ON lawyers("companyId", affiliation);

-- Comments
COMMENT ON COLUMN lawyers.affiliation IS 'Vínculo do advogado: ESCRITORIO (próprio escritório) ou ADVERSO (parte contrária)';
