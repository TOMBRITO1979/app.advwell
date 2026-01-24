-- Migração: Adicionar suporte a Telegram
-- Data: 2026-01-24
-- Descrição: Adiciona tabela telegram_configs e campos telegramChatId em users e clients

-- Criar tabela telegram_configs
CREATE TABLE IF NOT EXISTS telegram_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(36) NOT NULL UNIQUE,
  bot_token TEXT NOT NULL,
  bot_username VARCHAR(100),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_configs_company ON telegram_configs(company_id);

-- Adicionar campo telegram_chat_id em users
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Adicionar campo telegram_chat_id em clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Comentários
COMMENT ON TABLE telegram_configs IS 'Configurações de bot Telegram por empresa';
COMMENT ON COLUMN users.telegram_chat_id IS 'ID do chat Telegram do usuário para notificações';
COMMENT ON COLUMN clients.telegram_chat_id IS 'ID do chat Telegram do cliente para notificações';
