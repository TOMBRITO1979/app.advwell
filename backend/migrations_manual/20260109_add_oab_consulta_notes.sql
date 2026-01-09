-- Adicionar campo de notas para consultas OAB
-- Este campo armazena observações sobre a consulta (ex: limite de monitoramento atingido)

ALTER TABLE oab_consultas ADD COLUMN IF NOT EXISTS notes TEXT;
