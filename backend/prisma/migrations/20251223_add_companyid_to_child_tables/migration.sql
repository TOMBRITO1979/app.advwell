-- TAREFA 4.3: Add companyId to child tables for stronger multi-tenant isolation
-- This migration adds direct companyId references to child tables,
-- allowing more efficient queries and stronger data isolation.

-- ============================================================================
-- Step 1: Add nullable companyId columns
-- ============================================================================

ALTER TABLE "case_movements" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "case_documents" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "case_parts" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "case_audit_logs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "event_assignments" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- ============================================================================
-- Step 2: Populate companyId from parent tables
-- ============================================================================

-- CaseMovement: Get companyId from cases table
UPDATE "case_movements" cm
SET "companyId" = c."companyId"
FROM "cases" c
WHERE cm."caseId" = c."id" AND cm."companyId" IS NULL;

-- CaseDocument: Get companyId from cases table
UPDATE "case_documents" cd
SET "companyId" = c."companyId"
FROM "cases" c
WHERE cd."caseId" = c."id" AND cd."companyId" IS NULL;

-- CasePart: Get companyId from cases table
UPDATE "case_parts" cp
SET "companyId" = c."companyId"
FROM "cases" c
WHERE cp."caseId" = c."id" AND cp."companyId" IS NULL;

-- CaseAuditLog: Get companyId from cases table
UPDATE "case_audit_logs" cal
SET "companyId" = c."companyId"
FROM "cases" c
WHERE cal."caseId" = c."id" AND cal."companyId" IS NULL;

-- InstallmentPayment: Get companyId from financial_transactions table
UPDATE "installment_payments" ip
SET "companyId" = ft."companyId"
FROM "financial_transactions" ft
WHERE ip."financialTransactionId" = ft."id" AND ip."companyId" IS NULL;

-- EventAssignment: Get companyId from schedule_events table
UPDATE "event_assignments" ea
SET "companyId" = se."companyId"
FROM "schedule_events" se
WHERE ea."eventId" = se."id" AND ea."companyId" IS NULL;

-- CampaignRecipient: Get companyId from email_campaigns table
UPDATE "campaign_recipients" cr
SET "companyId" = ec."companyId"
FROM "email_campaigns" ec
WHERE cr."campaignId" = ec."id" AND cr."companyId" IS NULL;

-- SubscriptionPayment: Get companyId from client_subscriptions table
UPDATE "subscription_payments" sp
SET "companyId" = cs."companyId"
FROM "client_subscriptions" cs
WHERE sp."clientSubscriptionId" = cs."id" AND sp."companyId" IS NULL;

-- ============================================================================
-- Step 3: Delete orphaned records (those with no parent)
-- ============================================================================

DELETE FROM "case_movements" WHERE "companyId" IS NULL;
DELETE FROM "case_documents" WHERE "companyId" IS NULL;
DELETE FROM "case_parts" WHERE "companyId" IS NULL;
DELETE FROM "case_audit_logs" WHERE "companyId" IS NULL;
DELETE FROM "installment_payments" WHERE "companyId" IS NULL;
DELETE FROM "event_assignments" WHERE "companyId" IS NULL;
DELETE FROM "campaign_recipients" WHERE "companyId" IS NULL;
DELETE FROM "subscription_payments" WHERE "companyId" IS NULL;

-- ============================================================================
-- Step 4: Make companyId NOT NULL
-- ============================================================================

ALTER TABLE "case_movements" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "case_documents" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "case_parts" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "case_audit_logs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "installment_payments" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "event_assignments" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "campaign_recipients" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "subscription_payments" ALTER COLUMN "companyId" SET NOT NULL;

-- ============================================================================
-- Step 5: Add foreign key constraints
-- ============================================================================

ALTER TABLE "case_movements"
ADD CONSTRAINT "case_movements_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_documents"
ADD CONSTRAINT "case_documents_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_parts"
ADD CONSTRAINT "case_parts_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_audit_logs"
ADD CONSTRAINT "case_audit_logs_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "installment_payments"
ADD CONSTRAINT "installment_payments_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_assignments"
ADD CONSTRAINT "event_assignments_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_recipients"
ADD CONSTRAINT "campaign_recipients_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription_payments"
ADD CONSTRAINT "subscription_payments_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Step 6: Add indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS "case_movements_companyId_idx" ON "case_movements"("companyId");
CREATE INDEX IF NOT EXISTS "case_documents_companyId_idx" ON "case_documents"("companyId");
CREATE INDEX IF NOT EXISTS "case_parts_companyId_idx" ON "case_parts"("companyId");
CREATE INDEX IF NOT EXISTS "case_audit_logs_companyId_idx" ON "case_audit_logs"("companyId");
CREATE INDEX IF NOT EXISTS "installment_payments_companyId_idx" ON "installment_payments"("companyId");
CREATE INDEX IF NOT EXISTS "event_assignments_companyId_idx" ON "event_assignments"("companyId");
CREATE INDEX IF NOT EXISTS "campaign_recipients_companyId_idx" ON "campaign_recipients"("companyId");
CREATE INDEX IF NOT EXISTS "subscription_payments_companyId_idx" ON "subscription_payments"("companyId");
