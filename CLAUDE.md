# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro
- Grafana: https://grafana.advwell.pro

**Current Version:** v1.8.85 (Backend) | v1.8.85 (Frontend)

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
- Queues: `datajud-sync`, `email-campaign`, `whatsapp-messages`, `csv-import`, `monitoring`

## Key Modules

| Module | Description |
|--------|-------------|
| Cases | Process management with DataJud sync, parts (demandante/demandado), witnesses |
| Clients | Client management with portal access |
| Adverses | Adverse parties management |
| Lawyers | Internal lawyers management |
| Financial | Accounts payable/receivable, installments |
| Monitoring | OAB publication monitoring via ADVAPI |
| Documents | Legal document generation |
| Schedule | Calendar events, hearings, deadlines |

## Key Files

| Purpose | Location |
|---------|----------|
| Entry point | `backend/src/index.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Queue config | `backend/src/queues/*.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| Tenant middleware | `backend/src/middleware/tenant.ts` |
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
- `SYNC_CONCURRENCY=10`

## Adding Features

### New API Endpoint
1. Create controller: `backend/src/controllers/`
2. Create route: `backend/src/routes/`
3. Register in `backend/src/routes/index.ts`

### New Database Table
1. Update `backend/prisma/schema.prisma` (use `@map` for snake_case columns)
2. Create migration SQL: `backend/migrations_manual/`
3. Apply: `cat migration.sql | ssh root@5.78.137.1 "docker exec -i advwell-postgres psql -U postgres -d advtom"`
4. Run `npx prisma generate` to update client

## Monitoring

- **Grafana**: https://grafana.advwell.pro
- **Prometheus**: Internal (prometheus:9090)
