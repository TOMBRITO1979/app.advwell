-- Migration: Add state_registration field to clients table
-- Date: 2026-01-08
-- Description: Adds state_registration (Inscrição Estadual) field to clients

ALTER TABLE clients ADD COLUMN IF NOT EXISTS state_registration VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN clients.state_registration IS 'Inscrição Estadual (para Pessoa Jurídica)';

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_clients_state_registration ON clients("companyId", state_registration) WHERE state_registration IS NOT NULL;
