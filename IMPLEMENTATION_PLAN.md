# PLANO DE IMPLEMENTAÇÃO DETALHADO - ADVWELL 10/10
**Data**: 2025-11-24
**Versão Atual**: v67-deadline-clear-fix (backend), v87-audit-logs (frontend)
**Versão Alvo**: v68-production-optimization (backend), v88-production-ready (frontend)

---

## PROTOCOLO DE TESTES (OBRIGATÓRIO APÓS CADA FASE)

### 1. Testes de Funcionalidade Completa
- [ ] Login com usuário existente
- [ ] Adicionar dados em TODAS as abas:
  - [ ] Dashboard (verificar estatísticas)
  - [ ] Clientes (adicionar novo cliente PF e PJ)
  - [ ] Processos (adicionar novo processo)
  - [ ] Partes do Processo (adicionar AUTOR, REU, REPRESENTANTE_LEGAL)
  - [ ] Documentos (upload e link externo)
  - [ ] Agenda (todos os tipos: COMPROMISSO, TAREFA, PRAZO, AUDIENCIA)
  - [ ] Financeiro (INCOME e EXPENSE)
  - [ ] Contas a Pagar (criar conta pendente e recorrente)
  - [ ] Campanhas de Email (criar campanha draft)
  - [ ] Configurações (verificar dados da empresa)
  - [ ] Usuários (se ADMIN/SUPER_ADMIN)

### 2. Verificação no Banco de Dados
```bash
# Conectar ao banco
CONTAINER_ID=$(docker ps -q -f name=advtom_postgres)
docker exec -it $CONTAINER_ID psql -U postgres -d advtom

# Verificar dados inseridos
SELECT * FROM clients ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM cases ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM case_parts ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM documents ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM schedule_events ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM financial_transactions ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM accounts_payable ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM email_campaigns ORDER BY "createdAt" DESC LIMIT 1;
```

### 3. Testes de Edição
- [ ] Editar cada registro criado
- [ ] Verificar no banco se as alterações foram salvas
- [ ] Verificar audit logs (para processos)

### 4. Testes de Autenticação e CORS
- [ ] Logout
- [ ] Login novamente
- [ ] Verificar se o token JWT é válido
- [ ] Testar chamadas de API do frontend (verificar CORS)

### 5. Verificação de Migrações
```bash
cd backend
npx prisma migrate status
```

### 6. Logs de Erro
```bash
docker service logs advtom_backend --tail 50 | grep -i error
docker service logs advtom_frontend --tail 50 | grep -i error
```

**REGRA**: Só avançar para próxima fase se TODOS os testes passarem ✅

---

## FASE 1: DATABASE PERFORMANCE INDEXES
**Status**: 🔴 Pendente
**Tempo Estimado**: 30 minutos
**Downtime**: ❌ Nenhum (usando CONCURRENTLY)

### 1.1 Criar Migration SQL
**Arquivo**: `/root/advtom/backend/migrations_manual/20251124_add_performance_indexes.sql`

```sql
-- ============================================================================
-- PERFORMANCE INDEXES - Critical for production scale
-- ============================================================================

-- TENANT INDEXES (MOST CRITICAL)
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

-- RELATIONSHIP INDEXES
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

-- SEARCH INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_clientid
  ON financial_transactions("clientId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_caseid
  ON financial_transactions("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_caseid
  ON documents("caseId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_clientid
  ON documents("clientId");

-- Verify indexes created
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### 1.2 Executar Migration
```bash
CONTAINER_ID=$(docker ps -q -f name=advtom_postgres)
docker exec -i $CONTAINER_ID psql -U postgres -d advtom < /root/advtom/backend/migrations_manual/20251124_add_performance_indexes.sql
```

### 1.3 Verificar Índices Criados
```bash
docker exec $CONTAINER_ID psql -U postgres -d advtom -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';"
```

### 1.4 TESTES FASE 1
- [ ] Executar protocolo completo de testes
- [ ] Verificar performance de listagens (deve estar mais rápido)
- [ ] Verificar logs de erro

**Critério de Sucesso**: Todos os 15 índices criados, sistema funcionando normalmente ✅

---

## FASE 2: CONNECTION POOL & DATABASE CONFIG
**Status**: 🔴 Pendente
**Tempo Estimado**: 15 minutos
**Downtime**: ⚠️ Sim (restart backend)

### 2.1 Atualizar docker-compose.yml
**Arquivo**: `/root/advtom/docker-compose.yml`

```yaml
# Linha 53: Atualizar DATABASE_URL
- DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?connection_limit=20&pool_timeout=20&connect_timeout=10
```

### 2.2 Rebuild e Deploy Backend
```bash
cd /root/advtom
docker service update --env-add DATABASE_URL='postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?connection_limit=20&pool_timeout=20&connect_timeout=10' advtom_backend
```

### 2.3 Verificar Connection Pool
```bash
docker exec $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'advtom';"
```

### 2.4 TESTES FASE 2
- [ ] Executar protocolo completo de testes
- [ ] Verificar que conexões não excedem 20
- [ ] Testar timeout de conexão

**Critério de Sucesso**: Connection pool ativo, max 20 conexões ✅

---

## FASE 3: PAGINATION & QUERY OPTIMIZATION
**Status**: 🔴 Pendente
**Tempo Estimado**: 1.5 horas
**Downtime**: ❌ Nenhum (code changes)

### 3.1 Criar Utilitário de Paginação
**Novo arquivo**: `/root/advtom/backend/src/utils/pagination.ts`

```typescript
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export function getPaginationParams(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(
    Math.max(1, parseInt(query.pageSize) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}
```

### 3.2 Atualizar Controllers
**Arquivos a modificar**:
- `/root/advtom/backend/src/controllers/case.controller.ts` (método list)
- `/root/advtom/backend/src/controllers/client.controller.ts` (método list)
- `/root/advtom/backend/src/controllers/financial.controller.ts` (método list)
- `/root/advtom/backend/src/controllers/document.controller.ts` (método list)

**Exemplo - case.controller.ts**:
```typescript
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

async list(req: AuthRequest, res: Response) {
  try {
    const companyId = req.user!.companyId!;
    const { page, pageSize, skip, take } = getPaginationParams(req.query);

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where: { companyId },
        select: {
          id: true,
          processNumber: true,
          court: true,
          subject: true,
          status: true,
          deadline: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: { id: true, name: true }
          },
          deadlineResponsible: {
            select: { id: true, name: true }
          }
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.case.count({ where: { companyId } })
    ]);

    res.json(createPaginatedResponse(cases, total, page, pageSize));
  } catch (error) {
    console.error('Erro ao listar processos:', error);
    res.status(500).json({ error: 'Erro ao listar processos' });
  }
}
```

### 3.3 TESTES FASE 3
- [ ] Testar paginação em cada listagem
- [ ] Verificar que `?page=1&pageSize=10` funciona
- [ ] Verificar que default é 50 itens por página
- [ ] Verificar que max é 100 itens
- [ ] Executar protocolo completo de testes

**Critério de Sucesso**: Paginação funcionando em todos os endpoints de listagem ✅

---

## FASE 4: CPF/CNPJ VALIDATION
**Status**: 🔴 Pendente
**Tempo Estimado**: 45 minutos
**Downtime**: ❌ Nenhum

### 4.1 Criar Validators
**Novo arquivo**: `/root/advtom/backend/src/utils/validators.ts`

```typescript
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cnpj.charAt(12))) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cnpj.charAt(13))) return false;

  return true;
}

export function validateCPForCNPJ(value: string): { valid: boolean; type: 'CPF' | 'CNPJ' | null } {
  const cleaned = value.replace(/[^\d]/g, '');

  if (cleaned.length === 11) {
    return { valid: validateCPF(cleaned), type: 'CPF' };
  } else if (cleaned.length === 14) {
    return { valid: validateCNPJ(cleaned), type: 'CNPJ' };
  }

  return { valid: false, type: null };
}
```

### 4.2 Integrar em Controllers
**Arquivos a modificar**:
- `/root/advtom/backend/src/controllers/client.controller.ts`
- `/root/advtom/backend/src/controllers/case-part.controller.ts`

```typescript
import { validateCPForCNPJ } from '../utils/validators';

// Em create/update methods
if (cpf || cnpj) {
  const docValue = cpf || cnpj;
  const validation = validateCPForCNPJ(docValue);
  if (!validation.valid) {
    return res.status(400).json({
      error: `${validation.type || 'CPF/CNPJ'} inválido`
    });
  }
}
```

### 4.3 TESTES FASE 4
- [ ] Testar criar cliente com CPF válido
- [ ] Testar criar cliente com CPF inválido (deve rejeitar)
- [ ] Testar criar cliente com CNPJ válido
- [ ] Testar criar cliente com CNPJ inválido (deve rejeitar)
- [ ] Executar protocolo completo de testes

**Critério de Sucesso**: Validação funcionando, CPF/CNPJ inválidos rejeitados ✅

---

## FASE 5: TIMEOUT & ERROR HANDLING
**Status**: 🔴 Pendente
**Tempo Estimado**: 30 minutos
**Downtime**: ❌ Nenhum

### 5.1 Criar Error Handler Global
**Novo arquivo**: `/root/advtom/backend/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    userId: (req as any).user?.userId,
    companyId: (req as any).user?.companyId
  });

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ error: 'Database error' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Default error
  res.status(500).json({ error: 'Internal server error' });
}
```

### 5.2 Adicionar ao index.ts
**Arquivo**: `/root/advtom/backend/src/index.ts`

```typescript
import { errorHandler } from './middleware/errorHandler';

// ANTES de app.listen(), DEPOIS de todas as rotas:
app.use(errorHandler);
```

### 5.3 Adicionar Timeout ao DataJud
**Arquivo**: `/root/advtom/backend/src/controllers/case.controller.ts`

```typescript
const DATAJUD_TIMEOUT = 30000; // 30 segundos

async syncWithDataJud(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    // ... existing validation code ...

    // Sync com timeout
    const syncPromise = datajudService.syncCase(id);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DataJud sync timeout')), DATAJUD_TIMEOUT)
    );

    await Promise.race([syncPromise, timeoutPromise]);

    // ... rest of the code ...
  } catch (error: any) {
    if (error.message === 'DataJud sync timeout') {
      return res.status(408).json({ error: 'Timeout ao sincronizar com DataJud' });
    }
    // ... existing error handling ...
  }
}
```

### 5.4 TESTES FASE 5
- [ ] Provocar um erro e verificar se é logado corretamente
- [ ] Testar timeout do DataJud (se possível)
- [ ] Executar protocolo completo de testes

**Critério de Sucesso**: Erros sendo capturados e logados corretamente ✅

---

## FASE 6: BACKUP AUTOMATION
**Status**: 🔴 Pendente
**Tempo Estimado**: 30 minutos
**Downtime**: ❌ Nenhum

### 6.1 Criar Script de Backup
**Novo arquivo**: `/root/advtom/scripts/backup-daily.sh`

```bash
#!/bin/bash
set -e

# Configurações
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/advtom/backups/$DATE"
RETENTION_DAYS=30

echo "[$(date)] Starting backup..."

# Criar diretório
mkdir -p $BACKUP_DIR

# Backup do banco de dados
echo "Backing up database..."
CONTAINER_ID=$(docker ps -q -f name=advtom_postgres)
docker exec $CONTAINER_ID pg_dump -U postgres advtom > $BACKUP_DIR/database.sql

# Backup de arquivos de configuração
echo "Backing up config files..."
cp /root/advtom/docker-compose.yml $BACKUP_DIR/
cp -r /root/advtom/backend/prisma $BACKUP_DIR/ 2>/dev/null || true

# Compactar
echo "Compressing backup..."
tar -czf $BACKUP_DIR.tar.gz -C /root/advtom/backups $DATE
rm -rf $BACKUP_DIR

# Estatísticas
BACKUP_SIZE=$(du -h $BACKUP_DIR.tar.gz | cut -f1)
echo "Backup completed: $BACKUP_DIR.tar.gz ($BACKUP_SIZE)"

# Limpeza (manter apenas últimos 30 dias)
echo "Cleaning old backups..."
find /root/advtom/backups -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Upload para S3 (se configurado)
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "Uploading to S3..."
  aws s3 cp $BACKUP_DIR.tar.gz s3://advwell-backups/$(basename $BACKUP_DIR.tar.gz)
  echo "S3 upload completed"
fi

echo "[$(date)] Backup completed successfully"
```

### 6.2 Tornar Executável
```bash
chmod +x /root/advtom/scripts/backup-daily.sh
```

### 6.3 Configurar Cron
```bash
# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /root/advtom/scripts/backup-daily.sh >> /var/log/advwell-backup.log 2>&1") | crontab -
```

### 6.4 Testar Backup Manualmente
```bash
/root/advtom/scripts/backup-daily.sh
ls -lh /root/advtom/backups/
```

### 6.5 TESTES FASE 6
- [ ] Executar backup manualmente
- [ ] Verificar que arquivo .tar.gz foi criado
- [ ] Verificar tamanho do backup
- [ ] Testar restauração do backup
- [ ] Verificar que cron está configurado

**Critério de Sucesso**: Backup funcionando, cron configurado ✅

---

## FASE 7: HEALTH CHECK ENHANCEMENT
**Status**: 🔴 Pendente
**Tempo Estimado**: 15 minutos
**Downtime**: ❌ Nenhum

### 7.1 Melhorar Health Check
**Arquivo**: `/root/advtom/backend/src/routes/health.ts` (criar se não existir)

```typescript
import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'healthy' | 'unhealthy';
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

router.get('/health', async (req: Request, res: Response) => {
  const checks: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unhealthy',
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      }
    }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.status = 'unhealthy';
    checks.checks.database = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

export default router;
```

### 7.2 Registrar Rota
**Arquivo**: `/root/advtom/backend/src/routes/index.ts`

```typescript
import healthRouter from './health';
router.use('/', healthRouter);
```

### 7.3 TESTES FASE 7
- [ ] Acessar https://api.advwell.pro/api/health
- [ ] Verificar resposta JSON com database: healthy
- [ ] Executar protocolo completo de testes

**Critério de Sucesso**: Health check retornando status correto ✅

---

## FASE 8: BUILD, TEST & DEPLOY
**Status**: 🔴 Pendente
**Tempo Estimado**: 45 minutos
**Downtime**: ⚠️ Sim (rolling update)

### 8.1 Compilar Backend
```bash
cd /root/advtom/backend
npm run build
```

### 8.2 Criar Imagem Docker
```bash
docker build -t tomautomations/advwell-backend:v68-production-optimization backend/
```

### 8.3 Push para DockerHub
```bash
docker push tomautomations/advwell-backend:v68-production-optimization
```

### 8.4 Atualizar docker-compose.yml
```yaml
backend:
  image: tomautomations/advwell-backend:v68-production-optimization
```

### 8.5 Deploy
```bash
git add .
git commit -m "feat: Production optimization v68 - indexes, pagination, validation, monitoring"
git push origin clean-main

docker service update --image tomautomations/advwell-backend:v68-production-optimization advtom_backend
```

### 8.6 Verificar Deploy
```bash
docker service ps advtom_backend
docker service logs advtom_backend --tail 50
```

### 8.7 TESTES FINAIS
- [ ] Executar protocolo COMPLETO de testes
- [ ] Testar TODAS as funcionalidades
- [ ] Verificar performance melhorou
- [ ] Verificar logs sem erros
- [ ] Testar backup funciona
- [ ] Testar health check

**Critério de Sucesso**: Sistema 100% funcional, performance otimizada ✅

---

## CHECKLIST DE CONCLUSÃO

- [ ] Fase 1: Índices - CONCLUÍDO ✅
- [ ] Fase 2: Connection Pool - CONCLUÍDO ✅
- [ ] Fase 3: Paginação - CONCLUÍDO ✅
- [ ] Fase 4: Validação CPF/CNPJ - CONCLUÍDO ✅
- [ ] Fase 5: Timeout & Error Handling - CONCLUÍDO ✅
- [ ] Fase 6: Backup Automatizado - CONCLUÍDO ✅
- [ ] Fase 7: Health Check - CONCLUÍDO ✅
- [ ] Fase 8: Deploy - CONCLUÍDO ✅

## ROLLBACK PLAN

Se algo der errado:
```bash
# Reverter para versão anterior
docker service update --image tomautomations/advwell-backend:v67-deadline-clear-fix advtom_backend

# Remover índices (se necessário)
docker exec -it $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom
DROP INDEX CONCURRENTLY idx_users_companyid;
# ... etc
```

---

**NOTA**: Este documento deve ser consultado em caso de perda de conexão para retomar o trabalho exatamente de onde parou.
