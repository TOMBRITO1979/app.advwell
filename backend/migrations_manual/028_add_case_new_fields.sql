-- Migration: Add new fields to cases table
-- Date: 2025-01-08
-- Description: Adds phase, nature, rite, and distribution_date fields to cases

ALTER TABLE cases ADD COLUMN IF NOT EXISTS phase VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS nature VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS rite VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS distribution_date TIMESTAMP;

-- Comments
COMMENT ON COLUMN cases.phase IS 'Fase do processo (ex: Inicial, Instrução, Sentença, Recursos)';
COMMENT ON COLUMN cases.nature IS 'Natureza do processo (ex: Cível, Trabalhista, Criminal, Previdenciário)';
COMMENT ON COLUMN cases.rite IS 'Rito processual (ex: Ordinário, Sumário, Sumaríssimo)';
COMMENT ON COLUMN cases.distribution_date IS 'Data de distribuição do processo';

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_cases_phase ON cases(company_id, phase);
CREATE INDEX IF NOT EXISTS idx_cases_nature ON cases(company_id, nature);
