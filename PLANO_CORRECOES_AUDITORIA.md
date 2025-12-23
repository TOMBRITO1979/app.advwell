# PLANO DE CORRECOES - AUDITORIA DE PRODUCAO
## AdvWell SaaS - Sistema 100% Seguro e Funcional

**Data de Inicio:** 2025-12-23
**Objetivo:** Implementar todas as correcoes da auditoria de seguranca
**Meta:** Sistema com 100% de capacidade e seguranca

---

## PROTOCOLO DE VERIFICACAO (Executar apos CADA tarefa)

```bash
# 1. Verificar banco de dados e tabelas
docker exec $(docker ps -q -f name=advtom_postgres) psql -U advtom -d advtom -c "\dt"

# 2. Verificar Prisma e migracoes
cd backend && npx prisma migrate status

# 3. Verificar servicos Docker
docker stack ps advtom

# 4. Testar API health
curl -s https://api.advwell.pro/health

# 5. Testar CORS
curl -s -X OPTIONS https://api.advwell.pro/api/auth/login -H "Origin: https://app.advwell.pro"

# 6. Verificar Redis
docker exec $(docker ps -q -f name=advtom_redis) redis-cli ping

# 7. Verificar logs de erro
docker service logs advtom_backend --tail 20 2>&1 | grep -i error
```

---

## FASE 1: CORRECOES CRITICAS

### TAREFA 1.1: Atualizar Axios
- **Status:** [ ] PENDENTE

### TAREFA 1.2: Rate Limiting Database Backup
- **Status:** [ ] PENDENTE

### TAREFA 1.3: Integration Rate Limit Redis
- **Status:** [ ] PENDENTE

---

## FASE 2: AUTENTICACAO

### TAREFA 2.1: Endpoint Logout
- **Status:** [ ] PENDENTE

### TAREFA 2.2: Reset Token Seguro
- **Status:** [ ] PENDENTE

### TAREFA 2.3: Sanitizar Emails
- **Status:** [ ] PENDENTE

### TAREFA 2.4: Rate Limit LGPD
- **Status:** [ ] PENDENTE

### TAREFA 2.5: Rate Limit AI/DataJud
- **Status:** [ ] PENDENTE

---

## FASE 3: LOGGING

### TAREFA 3.1: Exception Handlers
- **Status:** [ ] PENDENTE

### TAREFA 3.2: Logger Estruturado
- **Status:** [ ] PENDENTE

---

## FASE 4: ESCALABILIDADE

### TAREFA 4.1: Bull Sentinel
- **Status:** [ ] PENDENTE

### TAREFA 4.2: Cron Flag
- **Status:** [ ] PENDENTE

### TAREFA 4.3: CompanyId Tabelas
- **Status:** [X] CONCLUIDO

---

## FASE 5: PROTECAO

### TAREFA 5.1: Webhook Rate Limit
- **Status:** [ ] PENDENTE

### TAREFA 5.2: Tribunal Whitelist
- **Status:** [ ] PENDENTE

### TAREFA 5.3: API Key 256 bits
- **Status:** [ ] PENDENTE
