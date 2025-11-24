-- Add case audit logs table
-- Migration: add_case_audit_logs
-- Date: 2025-01-24

-- Create case_audit_logs table
CREATE TABLE "case_audit_logs" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "case_audit_logs"
ADD CONSTRAINT "case_audit_logs_caseId_fkey"
FOREIGN KEY ("caseId")
REFERENCES "cases"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "case_audit_logs"
ADD CONSTRAINT "case_audit_logs_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "case_audit_logs_caseId_idx" ON "case_audit_logs"("caseId");
