-- Migration: Add CaseTag and PNJTag tables
-- Date: 2026-01-23

-- Create case_tags table
CREATE TABLE IF NOT EXISTS "case_tags" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_tags_pkey" PRIMARY KEY ("id")
);

-- Create pnj_tags table
CREATE TABLE IF NOT EXISTS "pnj_tags" (
    "id" TEXT NOT NULL,
    "pnjId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pnj_tags_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "case_tags_caseId_tagId_key" ON "case_tags"("caseId", "tagId");
CREATE UNIQUE INDEX IF NOT EXISTS "pnj_tags_pnjId_tagId_key" ON "pnj_tags"("pnjId", "tagId");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "case_tags_companyId_idx" ON "case_tags"("companyId");
CREATE INDEX IF NOT EXISTS "case_tags_caseId_idx" ON "case_tags"("caseId");
CREATE INDEX IF NOT EXISTS "case_tags_tagId_idx" ON "case_tags"("tagId");

CREATE INDEX IF NOT EXISTS "pnj_tags_companyId_idx" ON "pnj_tags"("companyId");
CREATE INDEX IF NOT EXISTS "pnj_tags_pnjId_idx" ON "pnj_tags"("pnjId");
CREATE INDEX IF NOT EXISTS "pnj_tags_tagId_idx" ON "pnj_tags"("tagId");

-- Add foreign key constraints
ALTER TABLE "case_tags" ADD CONSTRAINT "case_tags_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_tags" ADD CONSTRAINT "case_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_tags" ADD CONSTRAINT "case_tags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pnj_tags" ADD CONSTRAINT "pnj_tags_pnjId_fkey" FOREIGN KEY ("pnjId") REFERENCES "pnjs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pnj_tags" ADD CONSTRAINT "pnj_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pnj_tags" ADD CONSTRAINT "pnj_tags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
