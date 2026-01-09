-- Migration: Create client_messages table for Portal messaging
-- Date: 2026-01-08
-- Description: Bidirectional messaging between clients and office

-- Create enum for message sender
DO $$ BEGIN
    CREATE TYPE "MessageSender" AS ENUM ('CLIENT', 'OFFICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create client_messages table
CREATE TABLE IF NOT EXISTS client_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    "clientId" TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sender "MessageSender" NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    "readAt" TIMESTAMP,
    "readBy" TEXT,
    "parentId" TEXT REFERENCES client_messages(id) ON DELETE SET NULL,
    "createdBy" TEXT REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_messages_company ON client_messages("companyId");
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON client_messages("clientId");
CREATE INDEX IF NOT EXISTS idx_client_messages_company_client ON client_messages("companyId", "clientId");
CREATE INDEX IF NOT EXISTS idx_client_messages_parent ON client_messages("parentId");
CREATE INDEX IF NOT EXISTS idx_client_messages_created ON client_messages("createdAt");

-- Comments
COMMENT ON TABLE client_messages IS 'Mensagens bidirecionais entre clientes e escritório via Portal';
COMMENT ON COLUMN client_messages.sender IS 'Quem enviou: CLIENT (cliente) ou OFFICE (escritório)';
COMMENT ON COLUMN client_messages.subject IS 'Assunto da mensagem (opcional)';
COMMENT ON COLUMN client_messages.content IS 'Conteúdo da mensagem';
COMMENT ON COLUMN client_messages."readAt" IS 'Data/hora em que foi lida';
COMMENT ON COLUMN client_messages."readBy" IS 'ID do usuário que leu (para msgs do cliente)';
COMMENT ON COLUMN client_messages."parentId" IS 'ID da mensagem pai (para threads de resposta)';
