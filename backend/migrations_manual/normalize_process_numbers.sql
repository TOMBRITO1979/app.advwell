-- Migration: Normalizar números de processo para apenas dígitos
-- Versão: 1.8.98
-- Data: 2026-01-10
-- Descrição: Remove pontos, traços e outros caracteres não numéricos dos números de processo
--            para padronizar com o formato DataJud e ADVAPI

-- 1. Normalizar números de processo na tabela cases
UPDATE cases
SET "processNumber" = regexp_replace("processNumber", '\D', '', 'g')
WHERE "processNumber" IS NOT NULL
  AND "processNumber" ~ '[^0-9]';

-- 2. Normalizar números de processo na tabela publications
UPDATE publications
SET numero_processo = regexp_replace(numero_processo, '\D', '', 'g')
WHERE numero_processo IS NOT NULL
  AND numero_processo ~ '[^0-9]';

-- Verificar resultados
SELECT 'cases' as tabela, COUNT(*) as total,
       COUNT(CASE WHEN "processNumber" ~ '^[0-9]+$' THEN 1 END) as normalizados
FROM cases
WHERE "processNumber" IS NOT NULL
UNION ALL
SELECT 'publications' as tabela, COUNT(*) as total,
       COUNT(CASE WHEN numero_processo ~ '^[0-9]+$' THEN 1 END) as normalizados
FROM publications
WHERE numero_processo IS NOT NULL;
