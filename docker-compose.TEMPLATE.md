# Docker Compose Template - REFERENCIA OBRIGATORIA

**ARQUIVO DE REFERENCIA**: Este arquivo documenta a estrutura correta do `docker-compose.yml`.
**ANTES DE MODIFICAR O docker-compose.yml, CONSULTE ESTE TEMPLATE.**

---

## Estrutura de Variaveis de Ambiente

### Servicos que DEVEM ter variaveis identicas:
Os servicos `backend` e `backend-worker` DEVEM ter as mesmas variaveis de ambiente (exceto as especificas de cada um).

### Variaveis OBRIGATORIAS em AMBOS os servicos (backend E backend-worker):

```yaml
# Timezone
- TZ=${TZ}

# Database
- DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@178.156.188.93:5432/${POSTGRES_DB}?connection_limit=XX&pool_timeout=20&sslmode=require

# Redis
- REDIS_SENTINEL_ENABLED=false
- REDIS_PASSWORD=${REDIS_PASSWORD}
- REDIS_HOST=redis
- REDIS_PORT=6379

# JWT e Encryption
- JWT_SECRET=${JWT_SECRET}
- ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AWS S3
- AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
- AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
- AWS_REGION=${AWS_REGION}
- S3_BUCKET_NAME=${S3_BUCKET_NAME}

# SMTP
- SMTP_HOST=${SMTP_HOST}
- SMTP_PORT=${SMTP_PORT}
- SMTP_USER=${SMTP_USER}
- SMTP_PASSWORD=${SMTP_PASSWORD}
- SMTP_FROM=${SMTP_FROM}

# API URLs
- API_URL=${API_URL}
- FRONTEND_URL=${FRONTEND_URL}
- PORTAL_URL=${PORTAL_URL}

# DataJud CNJ
- DATAJUD_API_KEY=${DATAJUD_API_KEY}

# ADVAPI (Monitoramento OAB)
- ADVAPI_BASE_URL=${ADVAPI_BASE_URL}
- ADVAPI_API_KEY=${ADVAPI_API_KEY}
- ADVAPI_WEBHOOK_KEY=${ADVAPI_WEBHOOK_KEY}

# Stripe
- STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
- STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# Telegram (CRITICO - deve estar em AMBOS os servicos)
- TELEGRAM_DEFAULT_BOT_TOKEN=${TELEGRAM_DEFAULT_BOT_TOKEN}
- TELEGRAM_DEFAULT_BOT_USERNAME=${TELEGRAM_DEFAULT_BOT_USERNAME}

# Server
- PORT=3000
- NODE_ENV=production
- HEALTH_CHECK_KEY=${HEALTH_CHECK_KEY}
```

### Variaveis ESPECIFICAS por servico:

#### Backend (API):
```yaml
# Desabilita processamento de filas (processado pelo worker)
- ENABLE_QUEUE_PROCESSORS=false
- ENABLE_CRON=false
- NODE_OPTIONS=--max-old-space-size=1024
```

#### Backend-Worker:
```yaml
# Habilita processamento de filas e cron
- ENABLE_QUEUE_PROCESSORS=true
- ENABLE_CRON=true
- SYNC_CONCURRENCY=10
- NODE_OPTIONS=--max-old-space-size=768
```

---

## Checklist para Adicionar Nova Variavel

Quando adicionar uma nova variavel de ambiente:

1. [ ] Adicionar ao arquivo `.env`
2. [ ] Adicionar ao servico `backend` no `docker-compose.yml`
3. [ ] Adicionar ao servico `backend-worker` no `docker-compose.yml`
4. [ ] Executar `./deploy.sh` para aplicar

---

## Historico de Problemas

### 2026-01-29: TELEGRAM_DEFAULT_BOT_TOKEN
- **Problema**: Variavel estava apenas no `backend-worker`, faltava no `backend`
- **Sintoma**: Notificacoes Telegram falhavam quando chamadas diretamente pela API
- **Solucao**: Adicionar variaveis TELEGRAM em ambos os servicos

---

## Versoes Atuais (Atualizar ao fazer deploy)

- Backend: `v1.8.220`
- Frontend: `v1.8.312`

---

**LEMBRETE**: Este arquivo existe para evitar que variaveis sejam esquecidas.
Sempre verifique este template antes de modificar o docker-compose.yml.
