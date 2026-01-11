-- Migration: Adicionar campos MTD 1.2 do DataJud
-- Versão: 1.8.97
-- Data: 2026-01-10

-- Campos para processos criminais
ALTER TABLE cases ADD COLUMN IF NOT EXISTS numero_boletim_ocorrencia VARCHAR(255);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS numero_inquerito_policial VARCHAR(255);

-- Campos para prioridade processual (idoso, etc)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS prioridade_processual VARCHAR(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS prioridade_data_concessao TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS prioridade_data_fim TIMESTAMP;

-- Comentários
COMMENT ON COLUMN cases.numero_boletim_ocorrencia IS 'Números de B.O. vinculados ao processo (MTD 1.2)';
COMMENT ON COLUMN cases.numero_inquerito_policial IS 'Números de inquéritos policiais vinculados (MTD 1.2)';
COMMENT ON COLUMN cases.prioridade_processual IS 'Tipo de prioridade processual (ID=Idoso, etc) (MTD 1.2)';
COMMENT ON COLUMN cases.prioridade_data_concessao IS 'Data de concessão da prioridade processual (MTD 1.2)';
COMMENT ON COLUMN cases.prioridade_data_fim IS 'Data de fim da prioridade processual (MTD 1.2)';
