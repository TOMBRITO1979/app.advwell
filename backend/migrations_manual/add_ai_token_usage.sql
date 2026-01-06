-- Criar tabela de histórico de uso de tokens de IA
CREATE TABLE IF NOT EXISTS ai_token_usages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  "aiConfigId" VARCHAR(36) NOT NULL,
  "companyId" VARCHAR(36) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_ai_token_usage_config FOREIGN KEY ("aiConfigId") REFERENCES ai_configs(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_token_usage_company FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices para consultas por período
CREATE INDEX IF NOT EXISTS idx_ai_token_usages_company_date ON ai_token_usages("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_ai_token_usages_config_date ON ai_token_usages("aiConfigId", "createdAt");
