-- Migration: Add storage_limit column and new subscription plans (GRATUITO, BASICO)
-- Date: 2026-01-15

-- 1. Add new values to SubscriptionPlan enum
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'GRATUITO';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BASICO';

-- 2. Add storage_limit column to companies table (default 100MB for free plan)
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "storage_limit" BIGINT NOT NULL DEFAULT 104857600;

-- 3. Update existing companies based on their current plan
-- Bronze: 1GB = 1073741824 bytes
UPDATE "companies" SET "storage_limit" = 1073741824 WHERE "subscriptionPlan" = 'BRONZE';

-- Prata: 5GB = 5368709120 bytes
UPDATE "companies" SET "storage_limit" = 5368709120 WHERE "subscriptionPlan" = 'PRATA';

-- Ouro: 30GB = 32212254720 bytes
UPDATE "companies" SET "storage_limit" = 32212254720 WHERE "subscriptionPlan" = 'OURO';

-- Companies without plan or in trial keep default (100MB)
-- They can upgrade to get more storage

-- 4. Create index for faster storage queries
CREATE INDEX IF NOT EXISTS "idx_company_storage_limit" ON "companies"("storage_limit");

-- Note: Storage values reference:
-- GRATUITO: 100MB = 104857600 bytes (50 processos)
-- BASICO:   300MB = 314572800 bytes (150 processos)
-- BRONZE:   1GB   = 1073741824 bytes (1000 processos)
-- PRATA:    5GB   = 5368709120 bytes (2500 processos)
-- OURO:     30GB  = 32212254720 bytes (5000 processos)
