-- Migration: Add Legal Document Parties
-- Description: Allows multiple parties (authors, defendants, lawyers) per legal document
-- Date: 2026-01-05

-- Create enum for party types
DO $$ BEGIN
    CREATE TYPE "PartyType" AS ENUM ('AUTOR', 'REU', 'ADVOGADO', 'TESTEMUNHA', 'OUTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create legal_document_parties table
CREATE TABLE IF NOT EXISTS "legal_document_parties" (
    "id" TEXT NOT NULL,
    "legalDocumentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartyType" NOT NULL DEFAULT 'OUTRO',
    "cpfCnpj" TEXT,
    "oab" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_document_parties_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "legal_document_parties"
ADD CONSTRAINT "legal_document_parties_legalDocumentId_fkey"
FOREIGN KEY ("legalDocumentId") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "legal_document_parties"
ADD CONSTRAINT "legal_document_parties_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "legal_document_parties_legalDocumentId_idx" ON "legal_document_parties"("legalDocumentId");
CREATE INDEX IF NOT EXISTS "legal_document_parties_companyId_idx" ON "legal_document_parties"("companyId");
CREATE INDEX IF NOT EXISTS "legal_document_parties_type_idx" ON "legal_document_parties"("type");

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Migration completed: legal_document_parties table created successfully';
END $$;
