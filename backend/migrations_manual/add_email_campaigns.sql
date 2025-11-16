-- Add Email Campaign System
-- Migration: add_email_campaigns
-- Date: 2025-11-16
-- Description: Adiciona sistema de campanhas de email com SMTP configurável por empresa

-- ============================================================================
-- 1. SMTP Configurations Table
-- ============================================================================
-- Armazena configurações SMTP por empresa (cada empresa tem suas credenciais)

CREATE TABLE IF NOT EXISTS smtp_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  "user" VARCHAR(255) NOT NULL,
  password TEXT NOT NULL, -- Criptografado com AES-256
  "fromEmail" VARCHAR(255) NOT NULL,
  "fromName" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  -- Garantir que cada empresa tenha apenas uma configuração SMTP
  CONSTRAINT smtp_configs_company_unique UNIQUE ("companyId")
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS smtp_configs_company_idx ON smtp_configs("companyId");
CREATE INDEX IF NOT EXISTS smtp_configs_active_idx ON smtp_configs("isActive");

-- Comentários
COMMENT ON TABLE smtp_configs IS 'Configurações SMTP por empresa para envio de campanhas';
COMMENT ON COLUMN smtp_configs.password IS 'Senha SMTP criptografada com AES-256';
COMMENT ON COLUMN smtp_configs."isActive" IS 'Indica se a configuração está ativa e pode ser usada';

-- ============================================================================
-- 2. Email Campaigns Table
-- ============================================================================
-- Armazena campanhas de email criadas pelas empresas

CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'sending', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL, -- HTML content
  status "CampaignStatus" DEFAULT 'draft',
  "totalRecipients" INTEGER DEFAULT 0,
  "sentCount" INTEGER DEFAULT 0,
  "failedCount" INTEGER DEFAULT 0,
  "scheduledAt" TIMESTAMP,
  "sentAt" TIMESTAMP,
  "createdBy" TEXT REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS campaigns_company_idx ON email_campaigns("companyId");
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON email_campaigns("createdBy");
CREATE INDEX IF NOT EXISTS campaigns_scheduled_idx ON email_campaigns("scheduledAt");

-- Comentários
COMMENT ON TABLE email_campaigns IS 'Campanhas de email em massa criadas pelas empresas';
COMMENT ON COLUMN email_campaigns.body IS 'Conteúdo HTML do email';
COMMENT ON COLUMN email_campaigns.status IS 'Status: draft, sending, completed, failed, cancelled';
COMMENT ON COLUMN email_campaigns."totalRecipients" IS 'Total de destinatários da campanha';
COMMENT ON COLUMN email_campaigns."sentCount" IS 'Quantidade de emails enviados com sucesso';
COMMENT ON COLUMN email_campaigns."failedCount" IS 'Quantidade de emails que falharam';

-- ============================================================================
-- 3. Campaign Recipients Table
-- ============================================================================
-- Rastreia cada destinatário individual e status de envio

CREATE TYPE "RecipientStatus" AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "campaignId" TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  "recipientEmail" VARCHAR(255) NOT NULL,
  "recipientName" VARCHAR(255),
  status "RecipientStatus" DEFAULT 'pending',
  "sentAt" TIMESTAMP,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS recipients_campaign_idx ON campaign_recipients("campaignId");
CREATE INDEX IF NOT EXISTS recipients_status_idx ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS recipients_email_idx ON campaign_recipients("recipientEmail");

-- Índice composto para evitar duplicatas na mesma campanha
CREATE INDEX IF NOT EXISTS recipients_campaign_email_idx ON campaign_recipients("campaignId", "recipientEmail");

-- Comentários
COMMENT ON TABLE campaign_recipients IS 'Destinatários individuais de cada campanha com rastreamento de status';
COMMENT ON COLUMN campaign_recipients.status IS 'Status: pending, sent, failed';
COMMENT ON COLUMN campaign_recipients."errorMessage" IS 'Mensagem de erro caso o envio falhe';

-- ============================================================================
-- 4. Grants e Permissões (se necessário)
-- ============================================================================

-- Se houver roles específicos, adicionar GRANTs aqui
-- GRANT SELECT, INSERT, UPDATE, DELETE ON smtp_configs TO app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON email_campaigns TO app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_recipients TO app_role;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
