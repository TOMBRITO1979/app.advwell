-- Migration: Add ADVAPI extra fields to publications table
-- Date: 2026-01-21
-- Description: Adds new fields to store additional data from ADVAPI callbacks
--              (comarca, classeProcessual, partes, etc.)

-- All fields are nullable to maintain backward compatibility with existing records

-- Add texto_limpo (text without HTML/tags)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS texto_limpo TEXT;

-- Add comarca
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS comarca VARCHAR(255);

-- Add classe_processual (ex: Cumprimento de sentença)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS classe_processual VARCHAR(255);

-- Add nome_orgao (ex: 3ª Vara Cível)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS nome_orgao VARCHAR(255);

-- Add parte_autor (author/plaintiff name)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS parte_autor TEXT;

-- Add parte_reu (defendant name)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS parte_reu TEXT;

-- Add data_disponibilizacao (availability date)
ALTER TABLE publications
ADD COLUMN IF NOT EXISTS data_disponibilizacao TIMESTAMP;

-- Add index for comarca searches
CREATE INDEX IF NOT EXISTS idx_publications_comarca ON publications(comarca);

-- Add index for classe_processual searches
CREATE INDEX IF NOT EXISTS idx_publications_classe_processual ON publications(classe_processual);
