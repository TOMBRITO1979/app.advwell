-- Migration: create_document_requests_table
-- Date: 2026-01-21
-- Description: Creates document_requests table for requesting documents from clients

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE document_request_status AS ENUM ('PENDING', 'SENT', 'REMINDED', 'RECEIVED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('EMAIL', 'WHATSAPP', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the document_requests table
CREATE TABLE IF NOT EXISTS document_requests (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId"             TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "clientId"              TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  "requestedByUserId"     TEXT REFERENCES users(id) ON DELETE SET NULL,

  document_name           VARCHAR(255) NOT NULL,
  description             TEXT,
  internal_notes          TEXT,

  due_date                TIMESTAMP NOT NULL,
  status                  document_request_status DEFAULT 'PENDING',

  notification_channel    notification_channel,
  email_template_id       TEXT,
  whatsapp_template_id    TEXT,

  auto_remind             BOOLEAN DEFAULT true,
  auto_followup           BOOLEAN DEFAULT true,
  last_reminder_at        TIMESTAMP,
  reminder_count          INT DEFAULT 0,

  received_at             TIMESTAMP,
  received_document_id    TEXT UNIQUE REFERENCES shared_documents(id) ON DELETE SET NULL,
  client_notes            TEXT,

  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_requests_company ON document_requests("companyId");
CREATE INDEX IF NOT EXISTS idx_document_requests_client ON document_requests("clientId");
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_due_date ON document_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_document_requests_company_status ON document_requests("companyId", status);
CREATE INDEX IF NOT EXISTS idx_document_requests_company_client_status ON document_requests("companyId", "clientId", status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_document_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_requests_updated_at ON document_requests;
CREATE TRIGGER trigger_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_document_requests_updated_at();
