-- Migração: Adicionar campos neighborhood, custom_field_1, custom_field_2
-- Data: 2026-01-10
-- Descrição: Adiciona campo Bairro e campos personalizados "Outros" para Clientes, Adversos e Advogados

-- Adicionar campos em clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_field_1 VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_field_2 VARCHAR(255);

-- Adicionar campos em adverses
ALTER TABLE adverses ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE adverses ADD COLUMN IF NOT EXISTS custom_field_1 VARCHAR(255);
ALTER TABLE adverses ADD COLUMN IF NOT EXISTS custom_field_2 VARCHAR(255);

-- Adicionar campos em lawyers
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS custom_field_1 VARCHAR(255);
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS custom_field_2 VARCHAR(255);

-- Comentários nas colunas
COMMENT ON COLUMN clients.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN clients.custom_field_1 IS 'Campo personalizado 1 (Outros)';
COMMENT ON COLUMN clients.custom_field_2 IS 'Campo personalizado 2 (Outros 2)';

COMMENT ON COLUMN adverses.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN adverses.custom_field_1 IS 'Campo personalizado 1 (Outros)';
COMMENT ON COLUMN adverses.custom_field_2 IS 'Campo personalizado 2 (Outros 2)';

COMMENT ON COLUMN lawyers.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN lawyers.custom_field_1 IS 'Campo personalizado 1 (Outros)';
COMMENT ON COLUMN lawyers.custom_field_2 IS 'Campo personalizado 2 (Outros 2)';
