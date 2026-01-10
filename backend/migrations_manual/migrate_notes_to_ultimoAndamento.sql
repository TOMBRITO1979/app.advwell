-- Script de Migração: notes -> ultimo_andamento
-- Descrição: Move dados de andamento ADVAPI do campo notes para ultimo_andamento
-- Data: 2026-01-10

-- ============================================
-- PASSO 1: Verificar quantos registros serão afetados
-- ============================================
-- Execute primeiro para ver quantos registros serão migrados:

SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN notes IS NOT NULL AND notes != '' THEN 1 END) as com_notes,
    COUNT(CASE WHEN ultimo_andamento IS NOT NULL AND ultimo_andamento != '' THEN 1 END) as com_ultimo_andamento,
    COUNT(CASE WHEN (notes IS NOT NULL AND notes != '') AND (ultimo_andamento IS NULL OR ultimo_andamento = '') THEN 1 END) as para_migrar
FROM cases;

-- ============================================
-- PASSO 2: Visualizar registros que serão migrados
-- ============================================
-- Execute para ver os registros antes de migrar:

SELECT 
    id,
    process_number,
    subject,
    LEFT(notes, 100) as notes_preview,
    LEFT(ultimo_andamento, 100) as ultimo_andamento_preview,
    created_at
FROM cases 
WHERE 
    notes IS NOT NULL 
    AND notes != ''
    AND (ultimo_andamento IS NULL OR ultimo_andamento = '')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- PASSO 3: Executar a migração
-- ============================================
-- Move notes para ultimo_andamento APENAS onde:
-- - notes tem conteúdo
-- - ultimo_andamento está vazio ou nulo

UPDATE cases
SET 
    ultimo_andamento = notes,
    notes = NULL,
    updated_at = NOW()
WHERE 
    notes IS NOT NULL 
    AND notes != ''
    AND (ultimo_andamento IS NULL OR ultimo_andamento = '');

-- ============================================
-- PASSO 4: Verificar resultado
-- ============================================

SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN notes IS NOT NULL AND notes != '' THEN 1 END) as com_notes,
    COUNT(CASE WHEN ultimo_andamento IS NOT NULL AND ultimo_andamento != '' THEN 1 END) as com_ultimo_andamento
FROM cases;

-- ============================================
-- ALTERNATIVA: Migrar apenas processos importados via monitoramento
-- ============================================
-- Se quiser migrar apenas processos que vieram do monitoramento ADVAPI:

-- UPDATE cases
-- SET 
--     ultimo_andamento = notes,
--     notes = NULL,
--     updated_at = NOW()
-- WHERE 
--     notes IS NOT NULL 
--     AND notes != ''
--     AND (ultimo_andamento IS NULL OR ultimo_andamento = '')
--     AND subject LIKE '%monitoramento%';

