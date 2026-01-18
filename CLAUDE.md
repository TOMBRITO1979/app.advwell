# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro
- Grafana: https://grafana.advwell.pro
- Landing Page: https://advwell.pro

**Current Version:** v1.8.126 (Backend) | v1.8.175 (Frontend)

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

# Worker DATABASE_URL fix (if worker fails to start)
docker service update --env-add "DATABASE_URL=postgresql://postgres:PASSWORD@5.78.137.1:5432/advtom?connection_limit=15&pool_timeout=20&sslmode=require" advtom_backend-worker
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
| Cases | Process management with DataJud sync |
| Clients | Client management with portal access |
| Financial | Cash flow with cost center integration |
| Schedule | Calendar events, Kanban tasks, deadlines |
| Monitoring | OAB publication monitoring via ADVAPI |
| Reports | Filtered reports with CSV export |
| LGPD | Data privacy requests |

## Key Files

| Purpose | Location |
|---------|----------|
| Entry point | `backend/src/index.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Queue config | `backend/src/queues/*.ts` |
| Auth middleware | `backend/src/middleware/auth.ts` |
| Docker config | `docker-compose.yml` |
| Shared types | `frontend/src/types/schedule.ts` |

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

## Backup e Recuperacao

### Quick Recovery
```bash
# Restore from git tag
git reset --hard backup-2026-01-17-v2
./deploy.sh
```

### Backup Locations
- **Git tags**: GitHub - https://github.com/TOMBRITO1979/app.advwell/tags
- **VPS backup**: `/root/advwell-backup-2026-01-17.tar.gz`
- **DB backup**: `/backup/advtom_20260117.sql` (PostgreSQL VPS)

### Create New Backups
```bash
# Git tag
git tag -a backup-YYYY-MM-DD -m "Description"
git push origin backup-YYYY-MM-DD

# Database
ssh root@5.78.137.1 "docker exec advwell-postgres pg_dump -U postgres advtom > /backup/advtom_$(date +%Y%m%d).sql"
```

### Automated Backup (S3)
- Script: `/root/advwell/automated-backup.sh`
- Schedule: Daily at 02:00
- Bucket: `s3://advwell-app/database-backups/`

## Access Information

| VPS | IP | Description |
|-----|-----|-------------|
| Principal | 5.161.98.0 | Backend, Frontend, Redis, Traefik |
| PostgreSQL | 5.78.137.1 | Dedicated database |
