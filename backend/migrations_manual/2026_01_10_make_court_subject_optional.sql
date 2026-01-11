-- Tornar court e subject opcionais para permitir importação
-- de processos do Monitoramento apenas com número e andamento ADVAPI

ALTER TABLE cases ALTER COLUMN court DROP NOT NULL;
ALTER TABLE cases ALTER COLUMN subject DROP NOT NULL;
