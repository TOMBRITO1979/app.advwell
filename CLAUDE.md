# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro
- Grafana: https://grafana.advwell.pro
- Landing Page: https://advwell.pro

**Current Version:** v1.8.120 (Backend) | v1.8.156 (Frontend)

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
VPS Principal (5.161.98.0)       VPS PostgreSQL (5.78.137.1)
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
# Deploy (loads .env automatically)
./deploy.sh

# Logs
docker service logs advtom_backend -f
docker service logs advtom_backend-worker -f

# Health check
curl https://api.advwell.pro/health

# Database (via PostgreSQL VPS)
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -d advtom"
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
- Queues: `datajud-sync`, `email-campaign`, `whatsapp-messages`, `csv-import`, `csv-export`, `monitoring`

## Key Modules

| Module | Description |
|--------|-------------|
| Cases | Process management with DataJud sync (comarca, vara fields) |
| Clients | Client management with portal access |
| Financial | Cash flow with cost center integration |
| Accounts Payable | Expense management with cost centers |
| Cost Centers | Expense/income categorization |
| Monitoring | OAB publication monitoring via ADVAPI |
| Schedule | Calendar events, hearings, deadlines |
| Hearings | Hearing management with calendar view |
| Kanban | Visual task management board |
| Reports | Filtered reports with CSV export |
| LGPD | Data privacy requests (access, deletion, portability) |
| Audit Logs | Activity tracking for clients, cases, events |
| Manual/FAQ | Documentation system for users |

## Key Files

| Purpose | Location |
|---------|----------|
| Entry point | `backend/src/index.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Queue config | `backend/src/queues/*.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| Docker config | `docker-compose.yml` |

## Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL (sslmode=require)
- `JWT_SECRET` - Min 32 chars
- `ENCRYPTION_KEY` - 64 hex chars
- `REDIS_PASSWORD` - Redis auth
- `DATAJUD_API_KEY` - CNJ API

**Worker-specific:**
- `ENABLE_QUEUE_PROCESSORS=true`
- `ENABLE_CRON=true`

## Adding Features

### New API Endpoint
1. Create controller: `backend/src/controllers/`
2. Create route: `backend/src/routes/`
3. Register in `backend/src/routes/index.ts`

### New Database Table
1. Update `backend/prisma/schema.prisma`
2. Create migration SQL: `backend/migrations_manual/`
3. Apply: `cat migration.sql | ssh root@5.78.137.1 "docker exec -i advwell-postgres psql -U postgres -d advtom"`
4. Run `npx prisma generate`

## Plano de Segurança (Backup e Recuperação)

**IMPORTANTE:** Antes de fazer mudanças significativas no código, SEMPRE criar um ponto de recuperação.

### Tags de Backup no Git

| Tag | Data | Descrição |
|-----|------|-----------|
| `backup-2026-01-17` | 2026-01-17 | Backup estável (commit d786f69) |

**Criar nova tag de backup:**
```bash
git tag -a backup-YYYY-MM-DD -m "Descrição do backup"
git push origin backup-YYYY-MM-DD
```

**Recuperar para uma tag:**
```bash
# Ver código em um ponto específico
git checkout backup-YYYY-MM-DD

# Voltar para main
git checkout main

# Restaurar completamente (CUIDADO - perde alterações não commitadas)
git reset --hard backup-YYYY-MM-DD
```

### Outras Opções de Backup

| Tipo | Comando/Ação | Frequência Recomendada |
|------|--------------|------------------------|
| **Snapshot VPS Principal** | Painel Hetzner (5.161.98.0) | Antes de mudanças na infra |
| **Snapshot VPS PostgreSQL** | Painel Hetzner (5.78.137.1) | Semanal |
| **Backup PostgreSQL** | `ssh root@5.78.137.1 "docker exec advwell-postgres pg_dump -U postgres advtom > /backup/advtom_$(date +%Y%m%d).sql"` | Diário |
| **Clone local** | `git clone` para máquina local | Manter atualizado |

### Procedimento Antes de Mudanças Críticas

1. Criar tag de backup: `git tag -a backup-YYYY-MM-DD -m "Antes de [descrição]"`
2. Push da tag: `git push origin backup-YYYY-MM-DD`
3. Considerar snapshot da VPS se mudança afetar infraestrutura
4. Backup do banco se mudança afetar schema
