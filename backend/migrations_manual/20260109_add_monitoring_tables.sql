-- Migration: Add OAB Monitoring tables
-- Date: 2026-01-09
-- Description: Creates tables for OAB monitoring, consultas, and publications

-- Create MonitoringStatus enum
CREATE TYPE "MonitoringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- Create ConsultaStatus enum
CREATE TYPE "ConsultaStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Create monitored_oabs table
CREATE TABLE "monitored_oabs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "oab_state" TEXT NOT NULL,
    "status" "MonitoringStatus" NOT NULL DEFAULT 'ACTIVE',
    "tribunais" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_import" BOOLEAN NOT NULL DEFAULT true,
    "last_consulta_at" TIMESTAMP(3),
    "last_consulta_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_oabs_pkey" PRIMARY KEY ("id")
);

-- Create oab_consultas table
CREATE TABLE "oab_consultas" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monitored_oab_id" TEXT NOT NULL,
    "adv_api_consulta_id" TEXT,
    "status" "ConsultaStatus" NOT NULL DEFAULT 'PENDING',
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "tribunais" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_publicacoes" INTEGER NOT NULL DEFAULT 0,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "oab_consultas_pkey" PRIMARY KEY ("id")
);

-- Create publications table
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monitored_oab_id" TEXT NOT NULL,
    "numero_processo" TEXT NOT NULL,
    "sigla_tribunal" TEXT NOT NULL,
    "data_publicacao" TIMESTAMP(3) NOT NULL,
    "tipo_comunicacao" TEXT,
    "texto_comunicacao" TEXT,
    "imported" BOOLEAN NOT NULL DEFAULT false,
    "imported_case_id" TEXT,
    "imported_client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imported_at" TIMESTAMP(3),

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "monitored_oabs_companyId_oab_oab_state_key" ON "monitored_oabs"("companyId", "oab", "oab_state");
CREATE UNIQUE INDEX "publications_companyId_numero_processo_monitored_oab_id_key" ON "publications"("companyId", "numero_processo", "monitored_oab_id");

-- Create indexes for monitored_oabs
CREATE INDEX "monitored_oabs_companyId_idx" ON "monitored_oabs"("companyId");
CREATE INDEX "monitored_oabs_companyId_status_idx" ON "monitored_oabs"("companyId", "status");

-- Create indexes for oab_consultas
CREATE INDEX "oab_consultas_companyId_idx" ON "oab_consultas"("companyId");
CREATE INDEX "oab_consultas_monitored_oab_id_idx" ON "oab_consultas"("monitored_oab_id");
CREATE INDEX "oab_consultas_status_idx" ON "oab_consultas"("status");

-- Create indexes for publications
CREATE INDEX "publications_companyId_idx" ON "publications"("companyId");
CREATE INDEX "publications_monitored_oab_id_idx" ON "publications"("monitored_oab_id");
CREATE INDEX "publications_imported_idx" ON "publications"("imported");
CREATE INDEX "publications_companyId_imported_idx" ON "publications"("companyId", "imported");

-- Add foreign key constraints
ALTER TABLE "monitored_oabs" ADD CONSTRAINT "monitored_oabs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oab_consultas" ADD CONSTRAINT "oab_consultas_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oab_consultas" ADD CONSTRAINT "oab_consultas_monitored_oab_id_fkey" FOREIGN KEY ("monitored_oab_id") REFERENCES "monitored_oabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publications" ADD CONSTRAINT "publications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publications" ADD CONSTRAINT "publications_monitored_oab_id_fkey" FOREIGN KEY ("monitored_oab_id") REFERENCES "monitored_oabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
