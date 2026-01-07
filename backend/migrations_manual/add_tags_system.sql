-- Migration: add_tags_system
-- Description: Creates Tag, ClientTag, and LeadTag tables for centralized tag management
-- Date: 2026-01-07

-- Create tags table
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- Create client_tags junction table
CREATE TABLE IF NOT EXISTS "client_tags" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_tags_pkey" PRIMARY KEY ("id")
);

-- Create lead_tags junction table
CREATE TABLE IF NOT EXISTS "lead_tags" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

-- Indexes for tags
CREATE UNIQUE INDEX IF NOT EXISTS "tags_companyId_name_key" ON "tags"("companyId", "name");
CREATE INDEX IF NOT EXISTS "tags_companyId_idx" ON "tags"("companyId");

-- Indexes for client_tags
CREATE UNIQUE INDEX IF NOT EXISTS "client_tags_clientId_tagId_key" ON "client_tags"("clientId", "tagId");
CREATE INDEX IF NOT EXISTS "client_tags_companyId_idx" ON "client_tags"("companyId");
CREATE INDEX IF NOT EXISTS "client_tags_clientId_idx" ON "client_tags"("clientId");
CREATE INDEX IF NOT EXISTS "client_tags_tagId_idx" ON "client_tags"("tagId");

-- Indexes for lead_tags
CREATE UNIQUE INDEX IF NOT EXISTS "lead_tags_leadId_tagId_key" ON "lead_tags"("leadId", "tagId");
CREATE INDEX IF NOT EXISTS "lead_tags_companyId_idx" ON "lead_tags"("companyId");
CREATE INDEX IF NOT EXISTS "lead_tags_leadId_idx" ON "lead_tags"("leadId");
CREATE INDEX IF NOT EXISTS "lead_tags_tagId_idx" ON "lead_tags"("tagId");

-- Foreign keys for tags
ALTER TABLE "tags" ADD CONSTRAINT "tags_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for client_tags
ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_tags" ADD CONSTRAINT "client_tags_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for lead_tags
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comments for documentation
COMMENT ON TABLE "tags" IS 'Centralized tags for categorizing clients and leads per company';
COMMENT ON TABLE "client_tags" IS 'Junction table linking clients to multiple tags';
COMMENT ON TABLE "lead_tags" IS 'Junction table linking leads to multiple tags';
COMMENT ON COLUMN "tags"."color" IS 'Hex color code for tag badge display';
