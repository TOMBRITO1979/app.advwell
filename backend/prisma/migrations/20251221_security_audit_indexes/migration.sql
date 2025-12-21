-- Security audit: Add missing columns and indexes

-- Add companyId to permissions for tenant isolation
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "permissions_companyId_idx" ON "permissions"("companyId");

-- Add companyId to consent_logs for tenant isolation
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "consent_logs_companyId_idx" ON "consent_logs"("companyId");

-- Add missing indexes on cases table
CREATE INDEX IF NOT EXISTS "cases_deadline_idx" ON "cases"("deadline");
CREATE INDEX IF NOT EXISTS "cases_lastSyncedAt_idx" ON "cases"("lastSyncedAt");

-- Add missing indexes on case_documents and case_parts
CREATE INDEX IF NOT EXISTS "case_documents_caseId_idx" ON "case_documents"("caseId");
CREATE INDEX IF NOT EXISTS "case_parts_caseId_idx" ON "case_parts"("caseId");
