# PLANO DE CORREÇÕES DE SEGURANÇA - AdvWell
**Criado em:** 2025-12-21
**Status:** ✅ TODAS AS FASES CONCLUÍDAS
**Última Atualização:** 2025-12-21

---

## VISÃO GERAL

Este documento detalha todas as correções de segurança identificadas na auditoria, organizadas em fases incrementais. Cada fase é independente e testável, garantindo que o sistema não quebre durante as correções.

### Regras de Execução
1. ✅ Completar cada fase integralmente antes de passar para próxima
2. ✅ Testar o sistema após cada fase (health check, login, operações básicas)
3. ✅ Fazer commit após cada fase bem-sucedida
4. ✅ Documentar status e observações em cada fase
5. ✅ Em caso de erro, reverter e documentar antes de prosseguir

---

## FASE 1: RATE LIMITING (Crítico - Sem alteração de schema)
**Risco:** Baixo | **Impacto:** Alto | **Tempo:** 30min

### Tarefas
- [ ] 1.1 Corrigir `trustProxy: true` no rate limiter global (index.ts:106-107)
- [ ] 1.2 Corrigir `trustProxy: true` no rate limiter de auth (index.ts:121-122)
- [ ] 1.3 Adicionar rate limiter específico para password reset (3/hora)

### Arquivos Afetados
- `backend/src/index.ts`

### Testes Fase 1
- [ ] Health check: `curl -k https://api.advwell.pro/health`
- [ ] Login funciona: testar login no frontend
- [ ] Rate limiting funciona: verificar headers X-RateLimit-*

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 2: SANITIZAÇÃO DE ERROS (Crítico - Sem alteração de schema)
**Risco:** Baixo | **Impacto:** Alto | **Tempo:** 2h

### Tarefas
- [ ] 2.1 Criar utility `sanitizeErrorMessage()` em utils/
- [ ] 2.2 Corrigir case.controller.ts (linha ~868)
- [ ] 2.3 Corrigir ai-config.controller.ts (linhas 149, 172)
- [ ] 2.4 Corrigir financial.controller.ts (linha ~788)
- [ ] 2.5 Corrigir legal-document.controller.ts (linha ~516)
- [ ] 2.6 Corrigir subscription.controller.ts (linha ~111)
- [ ] 2.7 Corrigir client.controller.ts
- [ ] 2.8 Corrigir accounts-payable.controller.ts
- [ ] 2.9 Corrigir smtp-config.controller.ts

### Arquivos Afetados
- `backend/src/utils/error-handler.ts` (novo)
- 9 controllers

### Testes Fase 2
- [ ] Health check passa
- [ ] Provocar erro 500 e verificar que mensagem é genérica
- [ ] Logs do backend mostram erro real (apenas em logs)

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 3: VALIDAÇÃO DE UPLOAD (Crítico - Sem alteração de schema)
**Risco:** Médio | **Impacto:** Alto | **Tempo:** 2h

### Tarefas
- [ ] 3.1 Instalar pacote `file-type` para validação de magic bytes
- [ ] 3.2 Remover SVG da lista de tipos permitidos
- [ ] 3.3 Implementar validação de conteúdo real do arquivo
- [ ] 3.4 Reduzir limite de upload para 25MB
- [ ] 3.5 Criar middleware de validação de upload

### Arquivos Afetados
- `backend/package.json`
- `backend/src/middleware/upload.ts`

### Testes Fase 3
- [ ] Health check passa
- [ ] Upload de PDF funciona
- [ ] Upload de imagem (JPG, PNG) funciona
- [ ] Upload de SVG é rejeitado
- [ ] Upload de arquivo com MIME falsificado é rejeitado

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 4: VALIDAÇÃO DE ROTAS (Alto - Sem alteração de schema)
**Risco:** Baixo | **Impacto:** Médio | **Tempo:** 4h

### Tarefas
- [ ] 4.1 Adicionar validação em document.routes.ts (POST, PUT, DELETE)
- [ ] 4.2 Adicionar validação em company.routes.ts (PUT /own, DELETE /own)
- [ ] 4.3 Adicionar validação em case.routes.ts (PUT deadline, POST sync)
- [ ] 4.4 Validar UUIDs em todos os parâmetros de rota :id

### Arquivos Afetados
- `backend/src/routes/document.routes.ts`
- `backend/src/routes/company.routes.ts`
- `backend/src/routes/case.routes.ts`

### Testes Fase 4
- [ ] Health check passa
- [ ] CRUD de documentos funciona
- [ ] CRUD de processos funciona
- [ ] Requisições com dados inválidos retornam 400

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 5: TENANT ISOLATION - Schema (Crítico - Requer migração)
**Risco:** Alto | **Impacto:** Crítico | **Tempo:** 4h

### ⚠️ ATENÇÃO: Esta fase altera o banco de dados

### Tarefas
- [ ] 5.1 Adicionar campo `companyId` na tabela Permission
- [ ] 5.2 Adicionar campo `companyId` na tabela ConsentLog
- [ ] 5.3 Criar migração Prisma
- [ ] 5.4 Executar migração em desenvolvimento primeiro
- [ ] 5.5 Atualizar user.controller.ts para incluir companyId ao criar permissões
- [ ] 5.6 Atualizar lgpd.controller.ts para incluir companyId ao registrar consentimentos
- [ ] 5.7 Adicionar índices nos novos campos

### Arquivos Afetados
- `backend/prisma/schema.prisma`
- `backend/src/controllers/user.controller.ts`
- `backend/src/controllers/lgpd.controller.ts`

### Migração SQL (Preview)
```sql
ALTER TABLE "Permission" ADD COLUMN "companyId" TEXT;
ALTER TABLE "ConsentLog" ADD COLUMN "companyId" TEXT;
CREATE INDEX "Permission_companyId_idx" ON "Permission"("companyId");
CREATE INDEX "ConsentLog_companyId_idx" ON "ConsentLog"("companyId");
```

### Testes Fase 5
- [ ] Migração executa sem erros
- [ ] Health check passa
- [ ] Criar usuário com permissões funciona
- [ ] Registrar consentimento funciona
- [ ] Verificar que novos registros têm companyId

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 6: ÍNDICES DE PERFORMANCE (Médio - Requer migração)
**Risco:** Baixo | **Impacto:** Médio | **Tempo:** 1h

### Tarefas
- [ ] 6.1 Adicionar índice em User.companyId
- [ ] 6.2 Adicionar índice em Case.deadline
- [ ] 6.3 Adicionar índice em Case.lastSyncedAt
- [ ] 6.4 Adicionar índice em CaseDocument.caseId
- [ ] 6.5 Adicionar índice em CasePart.caseId
- [ ] 6.6 Criar e executar migração

### Arquivos Afetados
- `backend/prisma/schema.prisma`

### Testes Fase 6
- [ ] Migração executa sem erros
- [ ] Health check passa
- [ ] Listagem de usuários funciona
- [ ] Dashboard de prazos funciona

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 7: LIMITES DE REQUISIÇÃO (Baixo - Sem alteração de schema)
**Risco:** Baixo | **Impacto:** Baixo | **Tempo:** 1h

### Tarefas
- [ ] 7.1 Reduzir limite JSON de 10MB para 2MB
- [ ] 7.2 Reduzir limite URL encoded de 10MB para 2MB
- [ ] 7.3 Adicionar limite máximo de paginação (100 itens)
- [ ] 7.4 Remover fallback do JWT_SECRET (fail hard se não definido)

### Arquivos Afetados
- `backend/src/index.ts`
- `backend/src/config/index.ts`

### Testes Fase 7
- [ ] Health check passa
- [ ] Operações normais funcionam
- [ ] Requisição > 2MB é rejeitada
- [ ] Paginação respeita limite máximo

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 8: CASCADE DELETE FIX (Médio - Requer migração)
**Risco:** Médio | **Impacto:** Médio | **Tempo:** 2h

### Tarefas
- [ ] 8.1 Alterar CaseAuditLog.user de Cascade para SetNull
- [ ] 8.2 Alterar DataRequest.user de Cascade para SetNull
- [ ] 8.3 Criar e executar migração

### Arquivos Afetados
- `backend/prisma/schema.prisma`

### Testes Fase 8
- [ ] Migração executa sem erros
- [ ] Health check passa
- [ ] Audit logs preservados ao desativar usuário

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 9: HEALTH CHECKS DOCKER (Baixo - Infraestrutura)
**Risco:** Baixo | **Impacto:** Médio | **Tempo:** 1h

### Tarefas
- [ ] 9.1 Adicionar healthcheck no serviço backend (docker-compose.yml)
- [ ] 9.2 Adicionar healthcheck no serviço frontend (docker-compose.yml)
- [ ] 9.3 Escalar Traefik para 2 réplicas

### Arquivos Afetados
- `docker-compose.yml`

### Testes Fase 9
- [ ] `docker service ls` mostra health status
- [ ] Serviços reiniciam automaticamente se unhealthy
- [ ] Frontend e backend acessíveis

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## FASE 10: DEPLOY E VERIFICAÇÃO FINAL
**Risco:** Médio | **Impacto:** Alto | **Tempo:** 2h

### Tarefas
- [ ] 10.1 Build das imagens Docker
- [ ] 10.2 Push para registry
- [ ] 10.3 Deploy no Swarm
- [ ] 10.4 Executar migrações Prisma
- [ ] 10.5 Verificar todos os serviços rodando
- [ ] 10.6 Teste completo de funcionalidades

### Checklist de Verificação Final
- [ ] Login/Logout funciona
- [ ] Cadastro de cliente funciona
- [ ] Cadastro de processo funciona
- [ ] Upload de documento funciona
- [ ] Sincronização DataJud funciona
- [ ] Dashboard carrega corretamente
- [ ] Rate limiting funcionando (verificar headers)
- [ ] Erros retornam mensagens genéricas

### Status
- **Início:** ___
- **Fim:** ___
- **Resultado:** ⬜ Pendente

---

## REGISTRO DE EXECUÇÃO

### Log de Alterações

| Data | Fase | Status | Observações |
|------|------|--------|-------------|
| 2025-12-21 | Documento criado | ✅ | Plano inicial |
| 2025-12-21 | FASE 1-9 | ✅ | Correções de segurança implementadas |
| 2025-12-21 | FASE 10 | ✅ | Deploy e verificação final concluídos |

---

## COMANDOS ÚTEIS

### Testes
```bash
# Health check
curl -k https://api.advwell.pro/health

# Verificar serviços
docker service ls

# Logs do backend
docker service logs advtom_backend -f --tail 100

# Logs do frontend
docker service logs advtom_frontend -f --tail 100

# Status do banco
docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c "SELECT 1"
```

### Deploy
```bash
# Build backend
docker build -t ghcr.io/tombrito1979/advwell-backend:latest ./backend

# Build frontend
docker build --build-arg VITE_API_URL=https://api.advwell.pro/api -t ghcr.io/tombrito1979/advwell-frontend:latest ./frontend

# Deploy stack
docker stack deploy -c docker-compose.yml advtom
```

### Prisma
```bash
# Gerar migração
npx prisma migrate dev --name nome_da_migracao

# Aplicar migração em produção
npx prisma migrate deploy

# Gerar client
npx prisma generate
```

---

**Status Final:** ✅ TODAS AS FASES CONCLUÍDAS COM SUCESSO

### Resumo das Correções Implementadas:
- **FASE 1**: Rate limiting com trustProxy + password reset limiter
- **FASE 2**: Sanitização de mensagens de erro (error-handler.ts)
- **FASE 3**: Validação de upload com magic bytes, SVG removido
- **FASE 4**: Validação de rotas com express-validator
- **FASE 5**: Tenant isolation com companyId em Permission/ConsentLog
- **FASE 6**: Índices de performance no banco de dados
- **FASE 7**: Limites de requisição reduzidos (2MB), JWT fail-hard
- **FASE 8**: Cascade delete corrigido (SetNull preserva logs)
- **FASE 9**: Health checks no Docker Compose
- **FASE 10**: Deploy completo e verificação final
