-- Migration: Atualizar planos de assinatura
-- Data: 2024-01-23
-- Descrição: Migrar de BRONZE/PRATA/OURO para STARTER/PROFISSIONAL/ESCRITORIO/ENTERPRISE

-- IMPORTANTE: Fazer backup antes de executar!
-- pg_dump -h 178.156.188.93 -U postgres advtom > backup_before_plan_migration.sql

-- 1. Remover tipo temporário se existir (de execução anterior)
DROP TYPE IF EXISTS "SubscriptionPlan_new";

-- 2. Criar novo enum
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('GRATUITO', 'STARTER', 'PROFISSIONAL', 'ESCRITORIO', 'ENTERPRISE');

-- 3. Atualizar a coluna para usar o novo enum (com conversão)
-- Nota: Prisma usa camelCase para nomes de colunas
ALTER TABLE companies
  ALTER COLUMN "subscriptionPlan" TYPE "SubscriptionPlan_new"
  USING (
    CASE "subscriptionPlan"::text
      WHEN 'GRATUITO' THEN 'GRATUITO'::"SubscriptionPlan_new"
      WHEN 'BASICO' THEN 'STARTER'::"SubscriptionPlan_new"
      WHEN 'BRONZE' THEN 'STARTER'::"SubscriptionPlan_new"
      WHEN 'PRATA' THEN 'PROFISSIONAL'::"SubscriptionPlan_new"
      WHEN 'OURO' THEN 'ENTERPRISE'::"SubscriptionPlan_new"
      ELSE 'GRATUITO'::"SubscriptionPlan_new"
    END
  );

-- 4. Remover enum antigo
DROP TYPE "SubscriptionPlan";

-- 5. Renomear novo enum
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";

-- 6. Atualizar limites de processos para ilimitado (valor alto)
UPDATE companies
SET "casesLimit" = 999999
WHERE "subscriptionStatus" IN ('ACTIVE', 'TRIAL');

-- 7. Atualizar limites de armazenamento conforme novos planos
-- GRATUITO: 1GB (1073741824 bytes)
UPDATE companies
SET storage_limit = 1073741824
WHERE "subscriptionPlan" = 'GRATUITO';

-- STARTER: 10GB (10737418240 bytes)
UPDATE companies
SET storage_limit = 10737418240
WHERE "subscriptionPlan" = 'STARTER';

-- PROFISSIONAL: 20GB (21474836480 bytes)
UPDATE companies
SET storage_limit = 21474836480
WHERE "subscriptionPlan" = 'PROFISSIONAL';

-- ESCRITORIO: 30GB (32212254720 bytes)
UPDATE companies
SET storage_limit = 32212254720
WHERE "subscriptionPlan" = 'ESCRITORIO';

-- ENTERPRISE: 50GB (53687091200 bytes)
UPDATE companies
SET storage_limit = 53687091200
WHERE "subscriptionPlan" = 'ENTERPRISE';

-- 8. Atualizar limites de monitoramento
UPDATE companies SET monitoring_limit = 0 WHERE "subscriptionPlan" = 'GRATUITO';
UPDATE companies SET monitoring_limit = 150 WHERE "subscriptionPlan" = 'STARTER';
UPDATE companies SET monitoring_limit = 500 WHERE "subscriptionPlan" = 'PROFISSIONAL';
UPDATE companies SET monitoring_limit = 1000 WHERE "subscriptionPlan" = 'ESCRITORIO';
UPDATE companies SET monitoring_limit = 2000 WHERE "subscriptionPlan" = 'ENTERPRISE';

-- Verificar resultado
SELECT "subscriptionPlan", COUNT(*) as total,
       AVG("casesLimit") as avg_cases_limit,
       AVG(storage_limit) as avg_storage_limit
FROM companies
GROUP BY "subscriptionPlan";
