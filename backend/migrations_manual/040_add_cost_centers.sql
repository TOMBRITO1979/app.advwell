-- Migration: Add Cost Centers table and relations
-- Date: 2026-01-15

-- 1. Create CostCenterType enum
DO $$ BEGIN
    CREATE TYPE "CostCenterType" AS ENUM ('EXPENSE', 'INCOME', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create cost_centers table
CREATE TABLE IF NOT EXISTS "cost_centers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "type" "CostCenterType" NOT NULL DEFAULT 'BOTH',
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- 3. Add costCenterId column to financial_transactions
ALTER TABLE "financial_transactions"
ADD COLUMN IF NOT EXISTS "costCenterId" TEXT;

-- 4. Add costCenterId column to accounts_payable
ALTER TABLE "accounts_payable"
ADD COLUMN IF NOT EXISTS "costCenterId" TEXT;

-- 5. Create unique constraints
DO $$ BEGIN
    ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_companyId_name_key" UNIQUE ("companyId", "name");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_companyId_code_key" UNIQUE ("companyId", "code");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS "cost_centers_companyId_idx" ON "cost_centers"("companyId");
CREATE INDEX IF NOT EXISTS "cost_centers_active_idx" ON "cost_centers"("active");
CREATE INDEX IF NOT EXISTS "financial_transactions_costCenterId_idx" ON "financial_transactions"("costCenterId");
CREATE INDEX IF NOT EXISTS "accounts_payable_costCenterId_idx" ON "accounts_payable"("costCenterId");

-- 7. Add foreign keys
DO $$ BEGIN
    ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_costCenterId_fkey"
    FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_costCenterId_fkey"
    FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Create default cost centers for existing companies
INSERT INTO "cost_centers" ("id", "companyId", "name", "code", "description", "type", "color", "active", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    c.id,
    'Administrativo',
    'ADM',
    'Despesas administrativas gerais',
    'EXPENSE'::"CostCenterType",
    '#6366f1',
    true,
    NOW(),
    NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM "cost_centers" cc WHERE cc."companyId" = c.id AND cc.name = 'Administrativo'
);

INSERT INTO "cost_centers" ("id", "companyId", "name", "code", "description", "type", "color", "active", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    c.id,
    'Operacional',
    'OPE',
    'Despesas operacionais do escritório',
    'EXPENSE'::"CostCenterType",
    '#f59e0b',
    true,
    NOW(),
    NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM "cost_centers" cc WHERE cc."companyId" = c.id AND cc.name = 'Operacional'
);

INSERT INTO "cost_centers" ("id", "companyId", "name", "code", "description", "type", "color", "active", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    c.id,
    'Honorários',
    'HON',
    'Receitas de honorários advocatícios',
    'INCOME'::"CostCenterType",
    '#22c55e',
    true,
    NOW(),
    NOW()
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM "cost_centers" cc WHERE cc."companyId" = c.id AND cc.name = 'Honorários'
);
