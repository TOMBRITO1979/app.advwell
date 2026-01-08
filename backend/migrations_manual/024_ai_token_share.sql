-- Migration: Create ai_token_shares table for AI token sharing between companies
-- Date: 2025-01-08

-- Create ai_token_shares table
CREATE TABLE IF NOT EXISTS ai_token_shares (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider_company_id VARCHAR(36) NOT NULL,
    client_company_id VARCHAR(36) NOT NULL,
    token_limit INTEGER NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    notified_at_80 BOOLEAN NOT NULL DEFAULT false,
    notified_at_100 BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_provider_company FOREIGN KEY (provider_company_id)
        REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_client_company FOREIGN KEY (client_company_id)
        REFERENCES companies(id) ON DELETE CASCADE,

    -- Unique constraint: one provider can share to one client only once
    CONSTRAINT unique_provider_client UNIQUE (provider_company_id, client_company_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_token_shares_client ON ai_token_shares(client_company_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_shares_provider ON ai_token_shares(provider_company_id);

-- Add comment
COMMENT ON TABLE ai_token_shares IS 'Compartilhamento de tokens de IA entre empresas';
