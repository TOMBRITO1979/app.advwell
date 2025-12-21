# PLANO DE CORREÇÕES - AUDITORIA ADVWELL

**Data:** 2025-12-21
**Backup:** /root/backups/advwell-20251221_004632/
**Status:** EM EXECUÇÃO

---

## FASES DO PLANO

### FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
- [x] 1.1 Remover localhost do CORS em produção ✅ FEITO
- [x] 1.2 Adicionar Error Handler global no Express ✅ FEITO
- [ ] TESTE FASE 1: Será testado após rebuild na FASE 5

### FASE 2: CORREÇÕES DE BANCO DE DADOS
- [x] 2.1 Tabelas verificadas - todas 30 existem ✅ FEITO
- [x] 2.2 Corrigir Float → Decimal em 7 campos monetários ✅ FEITO
- [x] 2.3 Tenant isolation verificada - modelos herdam companyId via relações ✅ OK
- [ ] TESTE FASE 2: Será testado após rebuild na FASE 5

### FASE 3: MELHORIAS DE CÓDIGO
- [x] 3.1 Substituir redis.keys() por SCAN ✅ FEITO
- [x] 3.2 Adicionar React Error Boundary no frontend ✅ FEITO
- [ ] TESTE FASE 3: Será testado após rebuild na FASE 5

### FASE 4: INFRAESTRUTURA
- [x] 4.1 Logger Winston estruturado já existe (utils/logger.ts) ✅ JÁ EXISTIA
- [ ] TESTE FASE 4: Será testado junto com FASE 5

### FASE 5: BUILD E DEPLOY
- [x] 5.1 Rebuild backend Docker image ✅ FEITO
- [x] 5.2 Rebuild frontend Docker image ✅ FEITO
- [x] 5.3 Deploy no Docker Swarm ✅ FEITO
- [x] TESTE FASE 5: Health check completo - todos serviços saudáveis ✅

### FASE 6: VALIDAÇÃO FINAL
- [x] 6.1 Health check API - HEALTHY ✅
- [x] 6.2 Database conectado - OK ✅
- [x] 6.3 Redis conectado - OK ✅
- [x] 6.4 CORS bloqueando localhost em prod - OK ✅
- [x] 6.5 Error Handler retornando JSON - OK ✅
- [x] 6.6 Frontend acessível (HTTP 200) - OK ✅

### FASE 7: COMMIT E PUSH
- [ ] 7.1 Verificar .gitignore (sem secrets)
- [ ] 7.2 Commit das alterações
- [ ] 7.3 Push para GitHub

---

## PROGRESSO DETALHADO

### FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA

#### 1.1 Remover localhost do CORS
**Arquivo:** backend/src/index.ts
**Status:** PENDENTE
**Antes:** origin: [config.urls.frontend, 'http://localhost:5173']
**Depois:** origin: config.urls.frontend

#### 1.2 Error Handler Global
**Arquivo:** backend/src/index.ts
**Status:** PENDENTE
**Implementação:** Middleware de erro após todas as rotas

---

### FASE 2: CORREÇÕES DE BANCO DE DADOS

#### 2.1 Migrations Faltantes
**Status:** PENDENTE
**Tabelas que precisam migration:**
- accounts_payable
- financial_transactions
- installment_payments
- schedule_events
- email_campaigns
- campaign_recipients
- documents
- case_parts
- legal_documents
- smtp_configs
- stripe_configs
- service_plans
- client_subscriptions
- subscription_payments
- case_audit_logs

**NOTA:** Verificar se tabelas já existem no banco antes de criar migrations.

#### 2.2 Float → Decimal
**Status:** PENDENTE
**Campos a corrigir:**
- Case.value
- FinancialTransaction.amount
- InstallmentPayment.amount
- InstallmentPayment.paidAmount
- AccountPayable.amount
- ServicePlan.price
- SubscriptionPayment.amount

#### 2.3 Tenant Isolation
**Status:** PENDENTE
**Modelos sem companyId:**
- Permission (verificar se precisa)
- SystemConfig (global, OK)
- ConsentLog (precisa companyId)
- EventAssignment (herda do event)
- CaseMovement (herda do case)

---

### FASE 3-7: [Detalhes serão preenchidos conforme execução]

---

## CHECKLIST DE TESTES POR FASE

### Teste Fase 1
```bash
# 1. Health check
curl -k https://api.advwell.pro/health

# 2. CORS test (deve falhar de localhost em prod)
# 3. Error handler test (endpoint inexistente deve retornar JSON)
curl -k https://api.advwell.pro/api/nao-existe
```

### Teste Fase 2
```bash
# 1. Prisma validate
npx prisma validate

# 2. Verificar tabelas existem
docker exec postgres psql -U postgres -d advtom -c "\dt"
```

### Teste Fase 5
```bash
# 1. Verificar serviços
docker service ls | grep advtom

# 2. Health check completo
curl -k https://api.advwell.pro/health | jq .

# 3. Frontend acessível
curl -k -o /dev/null -w "%{http_code}" https://app.advwell.pro
```

### Teste Fase 6
```bash
# Testes manuais via API com token válido
# Login, CRUD clientes, CRUD casos, Atualizações
```

---

## NOTAS IMPORTANTES

1. **NUNCA commitar secrets** - Verificar .gitignore antes de push
2. **Backup antes de cada fase** - Já feito em /root/backups/
3. **Testar após cada mudança** - Não acumular mudanças sem teste
4. **Documentar erros encontrados** - Adicionar neste arquivo

---

## LOG DE EXECUÇÃO

### 2025-12-21 00:46
- Backup criado: /root/backups/advwell-20251221_004632/
- Plano criado: PLANO_CORRECOES_AUDITORIA.md
- Iniciando FASE 1...
