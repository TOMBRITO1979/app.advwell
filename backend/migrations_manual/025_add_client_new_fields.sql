-- Migration: Add new fields to clients table
-- Date: 2025-01-08
-- Description: Adds clientCondition (enum), pis, ctps, ctpsSerie, motherName, phone2, instagram, facebook

-- Create enum type for client condition
DO $$ BEGIN
    CREATE TYPE "ClientCondition" AS ENUM ('DEMANDANTE', 'DEMANDADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_condition "ClientCondition";
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pis VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ctps VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ctps_serie VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone2 VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN clients.client_condition IS 'Condição do cliente: DEMANDANTE ou DEMANDADO';
COMMENT ON COLUMN clients.pis IS 'Número do PIS';
COMMENT ON COLUMN clients.ctps IS 'Número da CTPS';
COMMENT ON COLUMN clients.ctps_serie IS 'Série da CTPS';
COMMENT ON COLUMN clients.mother_name IS 'Nome da mãe';
COMMENT ON COLUMN clients.phone2 IS 'Telefone secundário';
COMMENT ON COLUMN clients.instagram IS 'Perfil do Instagram';
COMMENT ON COLUMN clients.facebook IS 'Perfil do Facebook';
