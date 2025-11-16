-- Adicionar coluna 'tag' à tabela clients
-- Data: 16/11/2025
-- Descrição: Campo opcional para categorizar/etiquetar clientes

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tag VARCHAR(255);

-- Criar índice para melhorar performance em buscas por tag
CREATE INDEX IF NOT EXISTS idx_clients_tag ON clients(tag);

-- Comentário da coluna para documentação
COMMENT ON COLUMN clients.tag IS 'Tag ou categoria do cliente para organização';
