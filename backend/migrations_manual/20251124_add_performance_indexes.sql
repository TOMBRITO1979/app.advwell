-- ============================================================================
-- PERFORMANCE INDEXES - Critical for production scale
-- Data: 2025-11-24
-- Objetivo: Adicionar índices para otimizar queries com múltiplas empresas
-- ============================================================================

\echo '=== INICIANDO CRIAÇÃO DE ÍNDICES DE PERFORMANCE ==='
\echo ''

-- TENANT INDEXES (MOST CRITICAL - Necessários para isolamento multitenant eficiente)
\echo 'Criando índices de tenant...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_companyid
  ON users("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_companyid
  ON clients("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_companyid
  ON cases("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_companyid
  ON financial_transactions("companyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_companyid
  ON documents("companyId");

\echo 'Índices de tenant criados ✓'
\echo ''

-- RELATIONSHIP INDEXES (Otimizam joins e buscas por relacionamentos)
\echo 'Criando índices de relacionamentos...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_clientid
  ON cases("clientId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_status
  ON cases("status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_case_movements_caseid
  ON case_movements("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_case_movements_date
  ON case_movements("movementDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_case_documents_caseid
  ON case_documents("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_case_parts_caseid
  ON case_parts("caseId");

\echo 'Índices de relacionamentos criados ✓'
\echo ''

-- SEARCH INDEXES (Otimizam buscas e filtros)
\echo 'Criando índices de busca...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_clientid
  ON financial_transactions("clientId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_caseid
  ON financial_transactions("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_caseid
  ON documents("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_clientid
  ON documents("clientId");

\echo 'Índices de busca criados ✓'
\echo ''

-- Verificar índices criados
\echo '=== VERIFICANDO ÍNDICES CRIADOS ==='
\echo ''

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''
\echo '=== RESUMO ==='
SELECT
  'Total de índices criados: ' || count(*) as resultado
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

\echo ''
\echo '✅ MIGRATION CONCLUÍDA COM SUCESSO!'
