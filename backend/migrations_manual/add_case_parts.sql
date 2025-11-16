-- Adicionar tabela de partes do processo (Autor, Réu, Representante Legal)
-- Data: 01/11/2025
-- Descrição: Cria enum CasePartType e tabela case_parts para armazenar partes dos processos

-- Criar enum para tipo de parte
CREATE TYPE "CasePartType" AS ENUM ('AUTOR', 'REU', 'REPRESENTANTE_LEGAL');

-- Criar tabela case_parts
CREATE TABLE "case_parts" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "CasePartType" NOT NULL,

    -- Campos comuns
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "phone" TEXT,
    "address" TEXT,

    -- Campos específicos para AUTOR
    "email" TEXT,
    "civilStatus" TEXT,
    "profession" TEXT,
    "rg" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_parts_pkey" PRIMARY KEY ("id")
);

-- Adicionar foreign key para cases
ALTER TABLE "case_parts" ADD CONSTRAINT "case_parts_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX "case_parts_caseId_idx" ON "case_parts"("caseId");
CREATE INDEX "case_parts_type_idx" ON "case_parts"("type");

-- Comentários para documentação
COMMENT ON TABLE "case_parts" IS 'Partes do processo (Autor, Réu, Representante Legal)';
COMMENT ON COLUMN "case_parts"."type" IS 'Tipo de parte: AUTOR, REU ou REPRESENTANTE_LEGAL';
COMMENT ON COLUMN "case_parts"."name" IS 'Nome completo da parte';
COMMENT ON COLUMN "case_parts"."cpfCnpj" IS 'CPF ou CNPJ da parte';
COMMENT ON COLUMN "case_parts"."civilStatus" IS 'Estado civil (apenas para AUTOR)';
COMMENT ON COLUMN "case_parts"."profession" IS 'Profissão (apenas para AUTOR)';
COMMENT ON COLUMN "case_parts"."rg" IS 'RG (apenas para AUTOR)';
