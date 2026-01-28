# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## IMPORTANTE - LEIA ANTES DE QUALQUER DEPLOY

### SEMPRE use o script de deploy:
```bash
cd /root/advwell && ./deploy.sh
```

### NUNCA faça deploy manual:
```bash
# ❌ ERRADO - variáveis não serão exportadas
docker stack deploy -c docker-compose.yml advtom

# ❌ ERRADO - não crie serviços manualmente
docker service create ...
```

### Por que?
O `deploy.sh` automaticamente:
1. Exporta TODAS as variáveis do `.env` com `set -a`
2. Usa `envsubst` para interpolar variáveis no docker-compose.yml
3. Garante que o worker recebe variáveis críticas:
   - DATAJUD_API_KEY (sync DataJud)
   - ADVAPI_* (monitoramento OAB)
   - TELEGRAM_DEFAULT_BOT_TOKEN (notificações)
   - STRIPE_* (pagamentos)
   - SMTP_* (emails)

**Este lembrete só pode ser removido por solicitação expressa do usuário.**

---

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro
- Grafana: https://grafana.advwell.pro
- Landing Page: https://advwell.pro

**Current Version:** v1.8.204 (Backend) | v1.8.289 (Frontend)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TailwindCSS |
| Database | PostgreSQL 16 (dedicated VPS) |
| Cache | Redis 7 + Sentinel (HA) |
| Queue | Bull (Redis-based) |
| Deployment | Docker Swarm + Traefik |

## Infrastructure (Production)

```
VPS Principal (5.161.98.0)       VPS PostgreSQL (178.156.188.93)
30GB RAM | 8 vCPU                16GB RAM | 4 vCPU
├── Backend API (3 replicas)     └── PostgreSQL 16 (SSL/TLS)
├── Backend Worker (1 replica)       └── max_connections=500
├── Frontend (1 replica)
├── Redis Master + Replica
├── Redis Sentinel (3x)
├── Prometheus + Grafana
└── Traefik (SSL)
```

## Commands

```bash
# Deploy (usa o script que exporta todas variáveis automaticamente)
cd /root/advwell && ./deploy.sh

# Logs
docker service logs advtom_backend -f
docker service logs advtom_backend-worker -f

# Health check
curl https://api.advwell.pro/health

# Database (direct connection)
PGPASSWORD='<password>' psql -h 178.156.188.93 -U postgres -d advtom
```

## Architecture

### Multitenant Design
Row-level multitenancy with `companyId` on all models. Middleware `validateTenant` enforces isolation.

### User Roles
- **SUPER_ADMIN**: Platform admin, bypasses tenant restrictions
- **ADMIN**: Company admin
- **USER**: Limited access per permissions
- **CLIENT**: Portal access (restricted to own data)

### Queue Processing
Jobs processed by dedicated worker (not API replicas):
- `ENABLE_QUEUE_PROCESSORS=false` on API replicas
- `ENABLE_QUEUE_PROCESSORS=true` on worker
- Queues: `datajud-sync`, `email-campaign`, `whatsapp-messages`, `telegram-notifications`, `csv-import`, `csv-export`, `monitoring`
- Cron Jobs (hourly): `document-request-reminder`, `accounts-payable-reminder`, `appointment-reminder`, `deadline-reminder`

## Subscription Plans

| Plan | Price | Storage | Monitoring |
|------|-------|---------|------------|
| GRATUITO | R$0/mês | 1GB | 0 |
| STARTER | R$99/mês | 10GB | 150 |
| PROFISSIONAL | R$299/mês | 20GB | 500 |
| ESCRITORIO | R$499/mês | 30GB | 1000 |
| ENTERPRISE | R$899/mês | 50GB | 2000 |

- Trial: 7 days with STARTER limits
- Stripe webhooks: `POST /api/subscription/webhook`

## Key Modules

| Module | Description |
|--------|-------------|
| Cases | Process management with DataJud sync |
| Clients | Client management with portal access |
| Financial | Cash flow with cost center integration |
| Schedule | Calendar events, Kanban tasks, deadlines |
| Monitoring | OAB publication monitoring via ADVAPI |
| Document Requests | Request documents from clients with deadlines and auto-reminders |
| Reports | Filtered reports with CSV export |
| LGPD | Data privacy requests |
| Telegram | Bot notifications with system fallback (webhooks: /api/telegram/webhook/:companyId and /api/telegram/webhook/system) |

## ADVAPI Integration

External API for scraping CNJ lawyer publications from Diário Oficial.

**Endpoints Used:**
- `GET /health` - Health check
- `GET /api/consulta/buffer` - Query stored publications
- `POST /api/consulta` - Register lawyer for monitoring
- `GET /api/advogados` - List registered lawyers

**Environment Variables:**
- `ADVAPI_BASE_URL` - API base URL (https://api.advtom.com)
- `ADVAPI_API_KEY` - Authentication key
- `ADVAPI_WEBHOOK_KEY` - Webhook validation key
- `ADVAPI_CALLBACK_URL` - Callback URL for ADVAPI notifications (https://api.advwell.pro/api/advapi-webhook)

**Key Files:**
- `backend/src/services/advapi.service.ts` - API client
- `backend/src/queues/monitoring.queue.ts` - Async processing
- `backend/src/controllers/monitoring.controller.ts` - Business logic
- `frontend/src/pages/Monitoring.tsx` - UI (Importar Proc.)

**Test Connection:**
```bash
source .env && curl -s "${ADVAPI_BASE_URL}/health" -H "x-api-key: ${ADVAPI_API_KEY}"
```

## Docker Hub

- **Repository**: `tomautomations/advwell-backend` and `tomautomations/advwell-frontend`
- **Tag format**: `v1.8.XXX` (incrementing)
- Build: `docker build --no-cache -t tomautomations/advwell-backend:vX.X.X .`
- Push: `docker push tomautomations/advwell-backend:vX.X.X`

## Key Files

| Purpose | Location |
|---------|----------|
| Entry point | `backend/src/index.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Queue config | `backend/src/queues/*.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| Docker config | `docker-compose.yml` |
| Telegram service | `backend/src/services/telegram.service.ts` |

## Adding Features

### New API Endpoint
1. Create controller: `backend/src/controllers/`
2. Create route: `backend/src/routes/`
3. Register in `backend/src/routes/index.ts`

### New Database Table
1. Update `backend/prisma/schema.prisma`
2. Create migration SQL: `backend/migrations_manual/`
3. Apply: `PGPASSWORD='<password>' psql -h 178.156.188.93 -U postgres -d advtom -f migration.sql`
4. Run `npx prisma generate`

## Backup e Recuperacao

### Backup Locations
- **Git tags**: GitHub - https://github.com/TOMBRITO1979/app.advwell/tags
- **DB backup**: `/backup/` (PostgreSQL VPS)

### Create New Backups
```bash
# Git tag
git tag -a backup-YYYY-MM-DD -m "Description"
git push origin backup-YYYY-MM-DD

# Database
PGPASSWORD='<password>' pg_dump -h 178.156.188.93 -U postgres advtom > /backup/advtom_$(date +%Y%m%d).sql
```

## Access Information

| VPS | IP | Description |
|-----|-----|-------------|
| Principal | 5.161.98.0 | Backend, Frontend, Redis, Traefik |
| PostgreSQL | 178.156.188.93 | Dedicated database (production) |

**Database Query:**
```bash
PGPASSWORD='<password>' psql -h 178.156.188.93 -U postgres -d advtom -c "SELECT ..."
```
