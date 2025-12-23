# PLANO DE IMPLEMENTACAO PARA PRODUCAO - AdvWell
## Escala para 200 Empresas

**Data de Criacao:** 2025-12-23
**Status Geral:** EM ANDAMENTO

---

## INDICE DE FASES

| Fase | Descricao | Status | Data Conclusao |
|------|-----------|--------|----------------|
| 1 | Rebuild e Deploy do Backend (fix schedule) | CONCLUIDO | 2025-12-23 05:35 |
| 2 | Backup Automatizado PostgreSQL para S3 | PENDENTE | - |
| 3 | Rate Limiting por Empresa | PENDENTE | - |
| 4 | Alertas de Monitoramento | PENDENTE | - |
| 5 | Validacao Final e Testes | PENDENTE | - |

---

## FASE 1: REBUILD E DEPLOY DO BACKEND

### 1.1 Objetivo
Atualizar a imagem Docker do backend para incluir a correcao de seguranca no schedule controller (validacao de assignedUserIds).

### 1.2 Analise de Viabilidade

**Arquivos Modificados:**
- `backend/src/controllers/schedule.controller.ts`
  - Linha 30-46: Adicionada validacao de companyId para assignedUserIds (create)
  - Linha 360-376: Adicionada validacao de companyId para assignedUserIds (update)

**Impacto:**
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca no frontend
- Nenhuma mudanca em outras rotas
- Mudanca e retrocompativel (apenas adiciona validacao)

**Risco:** BAIXO

### 1.3 Plano de Implementacao

- [x] 1.3.1 Verificar se codigo compila sem erros (2025-12-23 05:28)
- [x] 1.3.2 Fazer build da imagem Docker (2025-12-23 05:29)
- [x] 1.3.3 Push para Docker Hub (2025-12-23 05:30)
- [x] 1.3.4 Atualizar servico no Swarm (2025-12-23 05:32)
- [x] 1.3.5 Verificar health check (2025-12-23 05:33)
- [x] 1.3.6 Testar endpoint de schedule (2025-12-23 05:33)

### 1.4 Checagem e Testes

- [x] API /health retorna status healthy
- [x] Endpoints de schedule respondendo
- [x] Endpoints de clientes respondendo
- [x] Endpoints de processos respondendo
- [x] Endpoints de financeiro respondendo
- [x] Endpoints de usuarios respondendo
- [x] Endpoints de backup-email respondendo
- [x] Banco de dados conectado (1 conexao ativa)
- [x] Redis conectado (PONG)

### 1.5 Analise de Viabilidade Concluida

**Resultado:** VIAVEL - Baixo risco

**Verificacoes Realizadas:**
- [x] Codigo alterado verificado (linhas 30-45 e 360-375)
- [x] Dockerfile existe e esta configurado corretamente
- [x] Nenhuma dependencia nova necessaria
- [x] Mudanca retrocompativel
- [x] Nao afeta banco de dados
- [x] Nao afeta frontend
- [x] Nao afeta outras rotas

**Arquivos Modificados:**
```
backend/src/controllers/schedule.controller.ts
  - Linha 30-45: Validacao create()
  - Linha 360-375: Validacao update()
```

### 1.6 Status
**[x] FASE 1 CONCLUIDA COM SUCESSO - 2025-12-23 05:35**

---

## FASE 2: BACKUP AUTOMATIZADO POSTGRESQL PARA S3

### 2.1 Objetivo
Implementar backup diario automatico do banco de dados para Amazon S3.

### 2.2 Analise de Viabilidade

**Componentes Necessarios:**
- Script de backup usando pg_dump
- Cron job no backend ou container separado
- Credenciais AWS ja existentes (S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Retencao de backups (manter ultimos 30 dias)

**Arquivos a Criar/Modificar:**
- `backend/src/services/database-backup.service.ts` (NOVO)
- `backend/src/index.ts` (adicionar cron job)

**Impacto:**
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca no frontend
- Adiciona novo servico de backup

**Risco:** BAIXO

### 2.3 Plano de Implementacao

- [ ] 2.3.1 Criar servico de backup (database-backup.service.ts)
- [ ] 2.3.2 Adicionar dependencia aws-sdk se necessario
- [ ] 2.3.3 Adicionar cron job para backup diario (03:00)
- [ ] 2.3.4 Implementar limpeza de backups antigos (>30 dias)
- [ ] 2.3.5 Testar backup manualmente
- [ ] 2.3.6 Verificar arquivo no S3
- [ ] 2.3.7 Build e deploy

### 2.4 Checagem e Testes

- [ ] Backup executado com sucesso
- [ ] Arquivo .sql.gz criado no S3
- [ ] Backup pode ser restaurado
- [ ] Limpeza de backups antigos funciona
- [ ] Outras funcionalidades nao afetadas

### 2.5 Status
**[ ] NAO INICIADO**

---

## FASE 3: RATE LIMITING POR EMPRESA

### 3.1 Objetivo
Implementar limite de requisicoes por empresa para prevenir abuso de recursos.

### 3.2 Analise de Viabilidade

**Componentes Necessarios:**
- Middleware de rate limiting por companyId
- Armazenamento em Redis
- Configuracao de limites (ex: 1000 req/min por empresa)

**Arquivos a Criar/Modificar:**
- `backend/src/middleware/company-rate-limit.ts` (NOVO)
- `backend/src/index.ts` (registrar middleware)

**Impacto:**
- Usa Redis existente
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca no frontend

**Risco:** BAIXO

### 3.3 Plano de Implementacao

- [ ] 3.3.1 Criar middleware company-rate-limit.ts
- [ ] 3.3.2 Configurar limites (1000 req/min por empresa)
- [ ] 3.3.3 Registrar middleware nas rotas protegidas
- [ ] 3.3.4 Adicionar header X-RateLimit-Remaining
- [ ] 3.3.5 Testar limite
- [ ] 3.3.6 Build e deploy

### 3.4 Checagem e Testes

- [ ] Rate limit funciona por empresa
- [ ] Header X-RateLimit-Remaining presente
- [ ] Retorna 429 quando limite excedido
- [ ] Empresas diferentes tem limites separados
- [ ] Outras funcionalidades nao afetadas

### 3.5 Status
**[ ] NAO INICIADO**

---

## FASE 4: ALERTAS DE MONITORAMENTO

### 4.1 Objetivo
Configurar alertas para metricas criticas no sistema.

### 4.2 Analise de Viabilidade

**Componentes Necessarios:**
- Prometheus ja configurado (exporters existem)
- Alertmanager (precisa adicionar)
- Regras de alerta

**Alertas a Configurar:**
- CPU > 80% por 5 minutos
- Memoria > 85% por 5 minutos
- Conexoes PostgreSQL > 400
- Redis memoria > 1.5GB
- Backend unhealthy
- Erro 500 > 10 por minuto

**Arquivos a Criar:**
- `monitoring/prometheus-alerts.yml` (NOVO)
- `monitoring/alertmanager.yml` (NOVO)
- Atualizar docker-compose.yml

**Impacto:**
- Adiciona novos containers
- Nenhuma mudanca no codigo
- Nenhuma mudanca no banco

**Risco:** BAIXO

### 4.3 Plano de Implementacao

- [ ] 4.3.1 Criar arquivo de regras de alerta
- [ ] 4.3.2 Criar configuracao do Alertmanager
- [ ] 4.3.3 Atualizar docker-compose.yml
- [ ] 4.3.4 Configurar notificacao (email ou webhook)
- [ ] 4.3.5 Deploy do stack de monitoramento
- [ ] 4.3.6 Testar alertas

### 4.4 Checagem e Testes

- [ ] Prometheus carrega regras de alerta
- [ ] Alertmanager esta rodando
- [ ] Alerta de teste dispara corretamente
- [ ] Notificacao recebida
- [ ] Sistema principal nao afetado

### 4.5 Status
**[ ] NAO INICIADO**

---

## FASE 5: VALIDACAO FINAL E TESTES

### 5.1 Objetivo
Validar que todas as funcionalidades estao operacionais apos implementacoes.

### 5.2 Checklist de Validacao

**Frontend:**
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Aba Clientes funciona (CRUD)
- [ ] Aba Processos funciona (CRUD + sync DataJud)
- [ ] Aba Agenda funciona (CRUD + conflitos)
- [ ] Aba Financeiro funciona (CRUD + parcelas)
- [ ] Aba Documentos funciona (upload + links)
- [ ] Aba Usuarios funciona (CRUD + permissoes)
- [ ] Aba Contas a Pagar funciona
- [ ] Aba Configuracoes funciona
- [ ] Backup por Email funciona

**Backend:**
- [ ] /health retorna healthy
- [ ] /health/detailed mostra todos checks OK
- [ ] Logs sem erros criticos
- [ ] Cron jobs executando (verificar logs)

**Banco de Dados:**
- [ ] Sem conexoes pendentes excessivas
- [ ] Queries rapidas (< 100ms)
- [ ] Sem locks

**Redis:**
- [ ] Conectado
- [ ] Memoria dentro do limite
- [ ] Leader election funcionando

**Seguranca:**
- [ ] CORS bloqueando origens nao autorizadas
- [ ] Rate limiting funcionando
- [ ] JWT validando corretamente

### 5.3 Status
**[ ] NAO INICIADO**

---

## HISTORICO DE IMPLEMENTACAO

| Data | Fase | Acao | Resultado |
|------|------|------|-----------|
| 2025-12-23 | Auditoria | Corrigido permissions.companyId NULL | SUCESSO |
| 2025-12-23 | Auditoria | Adicionado NOT NULL constraint | SUCESSO |
| 2025-12-23 | Auditoria | Corrigido unique constraint permissions | SUCESSO |
| 2025-12-23 | Auditoria | Criado indice legal_documents.companyId | SUCESSO |
| 2025-12-23 | Auditoria | Criado indice users.companyId | SUCESSO |
| 2025-12-23 | Auditoria | Fix schedule controller tenant validation | CODIGO ALTERADO |
| 2025-12-23 | Fase 1 | Rebuild e deploy | CONCLUIDO |
| - | Fase 2 | Backup S3 | PENDENTE |
| - | Fase 3 | Rate limit por empresa | PENDENTE |
| - | Fase 4 | Alertas | PENDENTE |
| - | Fase 5 | Validacao final | PENDENTE |

---

## NOTAS IMPORTANTES

1. **NAO EXPOR SENHAS:** Nenhum arquivo com credenciais deve ser commitado
2. **ROLLBACK:** Cada fase deve ter possibilidade de rollback
3. **BACKUP ANTES:** Sempre fazer backup do banco antes de mudancas
4. **HORARIO:** Deploys preferencialmente fora do horario comercial

---

## APROVACAO

**Fase 1 - Rebuild Backend:**
- [x] CONCLUIDO - 2025-12-23 05:35
- Risco: BAIXO
- Impacto: Correcao de seguranca critica
- Tempo real: ~7 minutos

**Fase 2 - Backup S3:**
- [ ] APROVADO PARA IMPLEMENTACAO

**Fase 3 - Rate Limit:**
- [ ] APROVADO PARA IMPLEMENTACAO

**Fase 4 - Alertas:**
- [ ] APROVADO PARA IMPLEMENTACAO

**Fase 5 - Validacao:**
- [ ] APROVADO PARA IMPLEMENTACAO

---

*Documento gerado automaticamente pela auditoria de producao*
