-- Migration: Adicionar companyId faltante em tabelas PNJ e GoogleCalendarConfig
-- Data: 2026-01-11
-- Descrição: AUDITORIA_COMPLETA.md - Issue 2 (companyId em pnj_parts/movements) e GoogleCalendarConfig

-- ============================================================================
-- 1. ADICIONAR companyId EM pnj_parts
-- ============================================================================

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pnj_parts' AND column_name = 'companyId'
    ) THEN
        -- Adicionar coluna (nullable primeiro para permitir update)
        ALTER TABLE pnj_parts ADD COLUMN "companyId" UUID;

        -- Popular com dados existentes (via pnj)
        UPDATE pnj_parts pp
        SET "companyId" = p."companyId"
        FROM pnjs p
        WHERE pp."pnjId" = p.id;

        -- Tornar NOT NULL após popular
        ALTER TABLE pnj_parts ALTER COLUMN "companyId" SET NOT NULL;

        -- Adicionar FK
        ALTER TABLE pnj_parts
        ADD CONSTRAINT pnj_parts_companyId_fkey
        FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE;

        -- Criar índice
        CREATE INDEX idx_pnj_parts_companyId ON pnj_parts("companyId");

        RAISE NOTICE 'companyId adicionado em pnj_parts';
    ELSE
        RAISE NOTICE 'companyId já existe em pnj_parts';
    END IF;
END $$;

-- ============================================================================
-- 2. ADICIONAR companyId EM pnj_movements
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pnj_movements' AND column_name = 'companyId'
    ) THEN
        -- Adicionar coluna (nullable primeiro para permitir update)
        ALTER TABLE pnj_movements ADD COLUMN "companyId" UUID;

        -- Popular com dados existentes (via pnj)
        UPDATE pnj_movements pm
        SET "companyId" = p."companyId"
        FROM pnjs p
        WHERE pm."pnjId" = p.id;

        -- Tornar NOT NULL após popular
        ALTER TABLE pnj_movements ALTER COLUMN "companyId" SET NOT NULL;

        -- Adicionar FK
        ALTER TABLE pnj_movements
        ADD CONSTRAINT pnj_movements_companyId_fkey
        FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE;

        -- Criar índice
        CREATE INDEX idx_pnj_movements_companyId ON pnj_movements("companyId");

        RAISE NOTICE 'companyId adicionado em pnj_movements';
    ELSE
        RAISE NOTICE 'companyId já existe em pnj_movements';
    END IF;
END $$;

-- ============================================================================
-- 3. ADICIONAR companyId EM google_calendar_configs
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'google_calendar_configs' AND column_name = 'companyId'
    ) THEN
        -- Adicionar coluna (nullable primeiro para permitir update)
        ALTER TABLE google_calendar_configs ADD COLUMN "companyId" UUID;

        -- Popular com dados existentes (via user)
        UPDATE google_calendar_configs gcc
        SET "companyId" = u."companyId"
        FROM users u
        WHERE gcc."userId" = u.id;

        -- Deletar configs órfãos (sem companyId após update)
        DELETE FROM google_calendar_configs WHERE "companyId" IS NULL;

        -- Tornar NOT NULL
        ALTER TABLE google_calendar_configs ALTER COLUMN "companyId" SET NOT NULL;

        -- Adicionar FK
        ALTER TABLE google_calendar_configs
        ADD CONSTRAINT google_calendar_configs_companyId_fkey
        FOREIGN KEY ("companyId") REFERENCES companies(id) ON DELETE CASCADE;

        -- Criar índice
        CREATE INDEX idx_google_calendar_configs_companyId ON google_calendar_configs("companyId");

        RAISE NOTICE 'companyId adicionado em google_calendar_configs';
    ELSE
        RAISE NOTICE 'companyId já existe em google_calendar_configs';
    END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 'pnj_parts' as tabela, COUNT(*) as registros,
       COUNT("companyId") as com_company_id
FROM pnj_parts
UNION ALL
SELECT 'pnj_movements', COUNT(*), COUNT("companyId") FROM pnj_movements
UNION ALL
SELECT 'google_calendar_configs', COUNT(*), COUNT("companyId") FROM google_calendar_configs;
