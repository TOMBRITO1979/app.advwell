-- Migration: Add SharedDocument table for client portal document sharing
-- Date: 2026-01-07
-- Description: Creates a system for sharing documents between law firms and clients
--              with support for digital signatures

-- Create enum for document status
DO $$ BEGIN
    CREATE TYPE "SharedDocumentStatus" AS ENUM ('PENDING', 'VIEWED', 'DOWNLOADED', 'SIGNED', 'UPLOADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create shared_documents table
CREATE TABLE IF NOT EXISTS shared_documents (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId"           TEXT NOT NULL,
    "clientId"            TEXT NOT NULL,

    -- Document data
    name                  VARCHAR(255) NOT NULL,
    description           TEXT,

    -- File storage
    "fileUrl"             TEXT NOT NULL,
    "fileKey"             TEXT NOT NULL,
    "fileSize"            INTEGER NOT NULL,
    "fileType"            VARCHAR(100) NOT NULL,

    -- Sharing control
    "sharedByUserId"      TEXT NOT NULL,
    "sharedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Configuration
    "requiresSignature"   BOOLEAN NOT NULL DEFAULT false,
    "allowDownload"       BOOLEAN NOT NULL DEFAULT true,

    -- Client signature
    "signedAt"            TIMESTAMP(3),
    "signatureUrl"        TEXT,
    "signatureKey"        TEXT,
    "signatureIp"         VARCHAR(50),
    "signatureUserAgent"  TEXT,

    -- Client upload
    "uploadedByClient"    BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt"          TIMESTAMP(3),

    -- Status and tracking
    status                "SharedDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "viewedAt"            TIMESTAMP(3),
    "downloadedAt"        TIMESTAMP(3),

    -- Metadata
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_shared_documents_company FOREIGN KEY ("companyId")
        REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_documents_client FOREIGN KEY ("clientId")
        REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_documents_shared_by FOREIGN KEY ("sharedByUserId")
        REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_documents_company ON shared_documents("companyId");
CREATE INDEX IF NOT EXISTS idx_shared_documents_client ON shared_documents("clientId");
CREATE INDEX IF NOT EXISTS idx_shared_documents_company_client ON shared_documents("companyId", "clientId");
CREATE INDEX IF NOT EXISTS idx_shared_documents_status ON shared_documents(status);
CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_at ON shared_documents("sharedAt");

-- Verify creation
SELECT 'shared_documents table created successfully' AS status;
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_name = 'shared_documents';
