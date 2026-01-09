-- Migration: Create lawyers table
-- Date: 2025-01-08
-- Description: Creates the lawyers table for managing law firm attorneys

-- Create LawyerType enum
DO $$ BEGIN
    CREATE TYPE "LawyerType" AS ENUM ('SOCIO', 'ASSOCIADO', 'ESTAGIARIO', 'EXTERNO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS lawyers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    oab VARCHAR(30),
    oab_state VARCHAR(5),
    lawyer_type "LawyerType" NOT NULL DEFAULT 'ASSOCIADO',
    team VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(30),
    phone2 VARCHAR(30),
    instagram VARCHAR(100),
    facebook VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lawyers_company_id ON lawyers(company_id);
CREATE INDEX IF NOT EXISTS idx_lawyers_company_oab ON lawyers(company_id, oab);
CREATE INDEX IF NOT EXISTS idx_lawyers_company_created ON lawyers(company_id, created_at);

-- Comments
COMMENT ON TABLE lawyers IS 'Tabela de advogados do escritório';
COMMENT ON COLUMN lawyers.lawyer_type IS 'Tipo de advogado: SOCIO, ASSOCIADO, ESTAGIARIO, EXTERNO';
COMMENT ON COLUMN lawyers.oab IS 'Número de inscrição na OAB';
COMMENT ON COLUMN lawyers.oab_state IS 'Estado da OAB (UF)';
COMMENT ON COLUMN lawyers.team IS 'Equipe/Área de atuação (ex: Trabalhista, Cível, Tributário)';
