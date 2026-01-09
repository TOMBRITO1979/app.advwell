-- Migration: Update CasePart to reference entities and add CaseWitness table

-- 1. Update CasePartType enum to new values
-- Drop old values and add new ones
DO $$
BEGIN
    -- Check if enum already has the new values
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEMANDANTE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CasePartType')) THEN
        ALTER TYPE "CasePartType" ADD VALUE IF NOT EXISTS 'DEMANDANTE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEMANDADO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CasePartType')) THEN
        ALTER TYPE "CasePartType" ADD VALUE IF NOT EXISTS 'DEMANDADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADVOGADO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CasePartType')) THEN
        ALTER TYPE "CasePartType" ADD VALUE IF NOT EXISTS 'ADVOGADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADVOGADO_ADVERSO' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'CasePartType')) THEN
        ALTER TYPE "CasePartType" ADD VALUE IF NOT EXISTS 'ADVOGADO_ADVERSO';
    END IF;
END$$;

-- 2. Add new columns to case_parts table for entity references
ALTER TABLE case_parts ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE case_parts ADD COLUMN IF NOT EXISTS "adverseId" TEXT;
ALTER TABLE case_parts ADD COLUMN IF NOT EXISTS "lawyerId" TEXT;

-- 3. Make legacy fields nullable (they already may be, but ensure they are)
ALTER TABLE case_parts ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "cpfCnpj" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "civilStatus" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "profession" DROP NOT NULL;
ALTER TABLE case_parts ALTER COLUMN "rg" DROP NOT NULL;

-- 4. Add foreign key constraints
ALTER TABLE case_parts
ADD CONSTRAINT case_parts_client_id_fkey
FOREIGN KEY ("clientId") REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE case_parts
ADD CONSTRAINT case_parts_adverse_id_fkey
FOREIGN KEY ("adverseId") REFERENCES adverses(id) ON DELETE SET NULL;

ALTER TABLE case_parts
ADD CONSTRAINT case_parts_lawyer_id_fkey
FOREIGN KEY ("lawyerId") REFERENCES lawyers(id) ON DELETE SET NULL;

-- 5. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_case_parts_client ON case_parts("clientId");
CREATE INDEX IF NOT EXISTS idx_case_parts_adverse ON case_parts("adverseId");
CREATE INDEX IF NOT EXISTS idx_case_parts_lawyer ON case_parts("lawyerId");

-- 6. Create case_witnesses table
CREATE TABLE IF NOT EXISTS case_witnesses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    mobile TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT case_witnesses_case_id_fkey
    FOREIGN KEY ("caseId") REFERENCES cases(id) ON DELETE CASCADE,

    CONSTRAINT case_witnesses_company_id_fkey
    FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE
);

-- 7. Add indexes for case_witnesses
CREATE INDEX IF NOT EXISTS idx_case_witnesses_case ON case_witnesses("caseId");
CREATE INDEX IF NOT EXISTS idx_case_witnesses_company ON case_witnesses("companyId");
