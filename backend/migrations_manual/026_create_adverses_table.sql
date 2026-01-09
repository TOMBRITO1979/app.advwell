-- Migration: Create adverses table
-- Date: 2025-01-08
-- Description: Creates the adverses table for managing opposing parties

CREATE TABLE IF NOT EXISTS adverses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    person_type "PersonType" NOT NULL DEFAULT 'FISICA',
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    state_registration VARCHAR(50),
    rg VARCHAR(30),
    pis VARCHAR(30),
    ctps VARCHAR(30),
    ctps_serie VARCHAR(30),
    mother_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(30),
    phone2 VARCHAR(30),
    instagram VARCHAR(100),
    facebook VARCHAR(255),
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    profession VARCHAR(100),
    nationality VARCHAR(100),
    marital_status VARCHAR(50),
    birth_date TIMESTAMP,
    representative_name VARCHAR(255),
    representative_cpf VARCHAR(20),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_adverses_company_id ON adverses(company_id);
CREATE INDEX IF NOT EXISTS idx_adverses_company_cpf ON adverses(company_id, cpf);
CREATE INDEX IF NOT EXISTS idx_adverses_company_created ON adverses(company_id, created_at);

-- Comments
COMMENT ON TABLE adverses IS 'Tabela de adversos (partes contrárias)';
COMMENT ON COLUMN adverses.person_type IS 'Tipo de pessoa: FISICA ou JURIDICA';
COMMENT ON COLUMN adverses.cpf IS 'CPF para pessoa física ou CNPJ para pessoa jurídica';
