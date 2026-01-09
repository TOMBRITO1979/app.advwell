-- Adicionar limite de monitoramento por empresa
-- Este campo controla quantas publicações podem ser importadas por mês

ALTER TABLE companies ADD COLUMN IF NOT EXISTS monitoring_limit INTEGER NOT NULL DEFAULT 500;

-- Comentário para documentação
COMMENT ON COLUMN companies.monitoring_limit IS 'Limite de publicações monitoradas por mês. Configurável pelo SUPER_ADMIN.';
