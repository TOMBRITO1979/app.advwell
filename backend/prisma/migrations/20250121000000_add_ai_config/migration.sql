-- Migration: add_ai_config
-- Description: Adiciona tabela de configuração de IA por empresa
-- Date: 2025-01-21

-- Criar enum para providers de IA
CREATE TYPE "AIProvider" AS ENUM ('openai', 'gemini', 'anthropic', 'groq');

-- Criar tabela ai_configs
CREATE TABLE "ai_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSummarize" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE UNIQUE INDEX "ai_configs_companyId_key" ON "ai_configs"("companyId");

-- Adicionar foreign key
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
