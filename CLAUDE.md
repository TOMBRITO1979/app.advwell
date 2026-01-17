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

---

### Backups Realizados

#### 1. Tags de Backup no Git (GitHub)

| Tag | Data | Commit | Descrição |
|-----|------|--------|-----------|
| `backup-2026-01-17` | 2026-01-17 | d786f69 | Backup inicial |
| `backup-2026-01-17-v2` | 2026-01-17 | 82f3cb3 | Backup com versões sincronizadas v1.8.120/v1.8.156 |

**Onde está:** GitHub - https://github.com/TOMBRITO1979/app.advwell/tags

#### 2. Backup Completo do Código (tar.gz)

| Arquivo | Data | Tamanho | Conteúdo |
|---------|------|---------|----------|
| `advwell-backup-2026-01-17.tar.gz` | 2026-01-17 | 270 MB | Código + .env + node_modules + dist |

**Onde está salvo:**
- VPS Principal: `/root/advwell-backup-2026-01-17.tar.gz`
- Computador local: `C:\Users\Bot 02\advwell-backup-2026-01-17.tar.gz`

#### 3. Backup do Banco de Dados (PostgreSQL)

| Arquivo | Data | Tamanho | Conteúdo |
|---------|------|---------|----------|
| `advtom_20260117.sql` | 2026-01-17 | 3.9 MB | Dump completo do banco (21.648 linhas) |

**Onde está salvo:**
- VPS PostgreSQL: `/backup/advtom_20260117.sql`

---

### Como Restaurar (Passo a Passo)

#### Cenário 1: Código quebrou mas VPS está OK

```bash
# Opção A: Voltar para tag de backup
cd /root/advwell
git fetch origin
git reset --hard backup-2026-01-17-v2

# Rebuild e deploy
./deploy.sh
```

#### Cenário 2: Precisa restaurar do arquivo tar.gz

```bash
# Na VPS Principal (5.161.98.0):

# 1. Backup da pasta atual (por segurança)
mv /root/advwell /root/advwell-quebrado

# 2. Extrair backup
cd /root
tar -xzvf advwell-backup-2026-01-17.tar.gz

# 3. Rebuild e deploy
cd /root/advwell
./deploy.sh
```

#### Cenário 3: Restaurar do computador local para VPS

```powershell
# No computador local (PowerShell):
scp "C:\Users\Bot 02\advwell-backup-2026-01-17.tar.gz" root@5.161.98.0:/root/
```

```bash
# Na VPS:
cd /root
mv advwell advwell-quebrado
tar -xzvf advwell-backup-2026-01-17.tar.gz
cd advwell
./deploy.sh
```

#### Cenário 4: Restaurar banco de dados (quando houver backup)

```bash
# Na VPS do PostgreSQL (5.78.137.1):
docker exec -i advwell-postgres psql -U postgres -d advtom < /backup/advtom_YYYYMMDD.sql
```

---

### Criar Novos Backups

#### Nova tag no Git:
```bash
git tag -a backup-YYYY-MM-DD -m "Descrição do backup"
git push origin backup-YYYY-MM-DD
```

#### Novo arquivo tar.gz:
```bash
tar -czvf /root/advwell-backup-YYYY-MM-DD.tar.gz -C /root advwell
```

#### Backup do PostgreSQL:
```bash
ssh root@5.78.137.1 "docker exec advwell-postgres pg_dump -U postgres advtom > /backup/advtom_$(date +%Y%m%d).sql"
```

#### Baixar backup para computador local:
```powershell
scp root@5.161.98.0:/root/advwell-backup-YYYY-MM-DD.tar.gz .
```

---

### Outras Opções de Backup

| Tipo | Comando/Ação | Frequência Recomendada |
|------|--------------|------------------------|
| **Snapshot VPS Principal** | Painel Hetzner (5.161.98.0) | Antes de mudanças na infra |
| **Snapshot VPS PostgreSQL** | Painel Hetzner (5.78.137.1) | Semanal |
| **Backup PostgreSQL** | Ver comando acima | Diário |
| **Clone local** | `git clone` para máquina local | Manter atualizado |

---

### Procedimento Antes de Mudanças Críticas

1. Criar tag de backup: `git tag -a backup-YYYY-MM-DD -m "Antes de [descrição]"`
2. Push da tag: `git push origin backup-YYYY-MM-DD`
3. Criar tar.gz se mudança for arriscada: `tar -czvf /root/advwell-backup-YYYY-MM-DD.tar.gz -C /root advwell`
4. Considerar snapshot da VPS se mudança afetar infraestrutura
5. Backup do banco se mudança afetar schema

---

### Informações de Acesso

| VPS | IP | Usuário | Descrição |
|-----|-----|---------|-----------|
| Principal | 5.161.98.0 | root | Backend, Frontend, Redis, Traefik |
| PostgreSQL | 5.78.137.1 | root | Banco de dados dedicado |
