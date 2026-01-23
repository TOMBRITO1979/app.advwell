-- Migration: Atualizar planos de assinatura
-- Data: 2024-01-23
-- Descrição: Migrar de BRONZE/PRATA/OURO para STARTER/PROFISSIONAL/ESCRITORIO/ENTERPRISE

-- IMPORTANTE: Fazer backup antes de executar!
-- pg_dump -h 178.156.188.93 -U postgres advtom > backup_before_plan_migration.sql

-- 1. Adicionar novos valores ao enum (PostgreSQL não permite ALTER ENUM diretamente)
-- Primeiro, precisamos criar um novo tipo e migrar

-- Criar novo enum
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('GRATUITO', 'STARTER', 'PROFISSIONAL', 'ESCRITORIO', 'ENTERPRISE');

-- Atualizar a coluna para usar o novo enum (com conversão)
ALTER TABLE companies
  ALTER COLUMN subscription_plan TYPE "SubscriptionPlan_new"
  USING (
    CASE subscription_plan::text
      WHEN 'GRATUITO' THEN 'GRATUITO'::"SubscriptionPlan_new"
      WHEN 'BASICO' THEN 'STARTER'::"SubscriptionPlan_new"
      WHEN 'BRONZE' THEN 'STARTER'::"SubscriptionPlan_new"
      WHEN 'PRATA' THEN 'PROFISSIONAL'::"SubscriptionPlan_new"
      WHEN 'OURO' THEN 'ENTERPRISE'::"SubscriptionPlan_new"
      ELSE 'GRATUITO'::"SubscriptionPlan_new"
    END
  );

-- Remover enum antigo
DROP TYPE "SubscriptionPlan";

-- Renomear novo enum
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

-- 2. Atualizar limites de processos para ilimitado (valor alto)
UPDATE companies
SET cases_limit = 999999
WHERE subscription_status IN ('ACTIVE', 'TRIAL');

-- 3. Atualizar limites de armazenamento conforme novos planos
-- GRATUITO: 1GB (1073741824 bytes)
UPDATE companies
SET storage_limit = 1073741824
WHERE subscription_plan = 'GRATUITO';

-- STARTER: 10GB (10737418240 bytes)
UPDATE companies
SET storage_limit = 10737418240
WHERE subscription_plan = 'STARTER';

-- PROFISSIONAL: 20GB (21474836480 bytes)
UPDATE companies
SET storage_limit = 21474836480
WHERE subscription_plan = 'PROFISSIONAL';

-- ESCRITORIO: 30GB (32212254720 bytes)
UPDATE companies
SET storage_limit = 32212254720
WHERE subscription_plan = 'ESCRITORIO';

-- ENTERPRISE: 50GB (53687091200 bytes)
UPDATE companies
SET storage_limit = 53687091200
WHERE subscription_plan = 'ENTERPRISE';

-- 4. Atualizar limites de monitoramento
UPDATE companies SET monitoring_limit = 0 WHERE subscription_plan = 'GRATUITO';
UPDATE companies SET monitoring_limit = 150 WHERE subscription_plan = 'STARTER';
UPDATE companies SET monitoring_limit = 500 WHERE subscription_plan = 'PROFISSIONAL';
UPDATE companies SET monitoring_limit = 1000 WHERE subscription_plan = 'ESCRITORIO';
UPDATE companies SET monitoring_limit = 2000 WHERE subscription_plan = 'ENTERPRISE';

-- Verificar resultado
SELECT subscription_plan, COUNT(*) as total,
       AVG(cases_limit) as avg_cases_limit,
       AVG(storage_limit) as avg_storage_limit
FROM companies
GROUP BY subscription_plan;
