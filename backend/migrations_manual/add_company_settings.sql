-- Adicionar campos de configuração à tabela companies
-- Data: 01/11/2025
-- Descrição: Adiciona campos para configurações da empresa (cidade, estado, CEP, logo)

-- Adicionar coluna city
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- Adicionar coluna state
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "state" TEXT;

-- Adicionar coluna zipCode
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "zipCode" TEXT;

-- Adicionar coluna logo
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "logo" TEXT;

-- Comentários para documentação
COMMENT ON COLUMN "companies"."city" IS 'Cidade da empresa';
COMMENT ON COLUMN "companies"."state" IS 'Estado da empresa (UF)';
COMMENT ON COLUMN "companies"."zipCode" IS 'CEP da empresa';
COMMENT ON COLUMN "companies"."logo" IS 'URL do logo da empresa';
