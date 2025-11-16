-- Migration: Add Documents Feature
-- Date: 2025-11-02
-- Version: v3-documents
-- Description: Creates documents table with support for uploads and external links

-- Create enums for storage types
CREATE TYPE "StorageType" AS ENUM ('upload', 'link');
CREATE TYPE "ExternalType" AS ENUM ('google_drive', 'google_docs', 'minio', 'other');

-- Create documents table
CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "caseId" TEXT,
  "clientId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "storageType" "StorageType" NOT NULL,
  "fileUrl" TEXT,
  "fileKey" TEXT,
  "fileSize" INTEGER,
  "fileType" TEXT,
  "externalUrl" TEXT,
  "externalType" "ExternalType",
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedBy_fkey"
  FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better query performance
CREATE INDEX "idx_documents_company" ON "documents"("companyId");
CREATE INDEX "idx_documents_case" ON "documents"("caseId");
CREATE INDEX "idx_documents_client" ON "documents"("clientId");
CREATE INDEX "idx_documents_created" ON "documents"("createdAt" DESC);

-- Add check constraints
ALTER TABLE "documents" ADD CONSTRAINT "check_case_or_client"
  CHECK (
    ("caseId" IS NOT NULL AND "clientId" IS NULL) OR
    ("caseId" IS NULL AND "clientId" IS NOT NULL)
  );

ALTER TABLE "documents" ADD CONSTRAINT "check_storage_fields"
  CHECK (
    ("storageType" = 'upload' AND "fileUrl" IS NOT NULL) OR
    ("storageType" = 'link' AND "externalUrl" IS NOT NULL)
  );
