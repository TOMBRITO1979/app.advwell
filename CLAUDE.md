# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

AdvWell is a multitenant SaaS for Brazilian law firms with DataJud CNJ integration.

**Live URLs:**
- Frontend: https://app.advwell.pro
- Backend API: https://api.advwell.pro

**Current Versions:** Check `docker-compose.yml` for image tags

**Key Features:**
- Multi-grade DataJud synchronization (G1, G2, G3)
- AI-powered case summarization (OpenAI GPT, Google Gemini)
- Email campaigns with templates
- Accounts payable with recurring bills
- Agenda/schedule with Google Meet integration
- Deadlines tracking with color-coded urgency
- Financial management (income/expense)
- Document management (S3 + external links)
- CSV import/export for clients and cases
- Role-based access control (SUPER_ADMIN, ADMIN, USER)

## Technology Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL 16 + Prisma ORM
- JWT Authentication
- AWS S3 for documents
- node-cron for scheduled tasks

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS + Zustand
- React Router + Axios

### Infrastructure
- Docker Swarm (4 backend replicas) + Traefik (SSL)
- PostgreSQL 16 (max_connections=500)
- Redis 7 (2GB cache + job queues)
- Prometheus + Alertmanager (monitoring)

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev                    # Dev server with hot reload
npm run build                  # Compile TypeScript
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Vite dev server (port 5173)
npm run build                  # TypeScript check + build
```

### Deployment
```bash
./deploy.sh                    # Exports .env vars and deploys stack
docker stack ps advtom         # Check service status
docker service logs advtom_backend -f   # View logs
```

## Architecture

### Multitenant Design
Row-level multitenancy with `companyId` on all data models. The `validateTenant` middleware enforces isolation.

### User Roles
- **SUPER_ADMIN**: Manages companies, bypasses tenant restrictions
- **ADMIN**: Manages their company and users
- **USER**: Basic access with permission-based restrictions

### API Routes
All routes under `/api` prefix:
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/companies/*` - Company management
- `/api/clients/*` - Client management
- `/api/cases/*` - Case management + DataJud sync
- `/api/financial/*` - Financial transactions
- `/api/documents/*` - Document management
- `/api/schedule/*` - Agenda/events
- `/api/accounts-payable/*` - Bills
- `/api/smtp-config/*` - SMTP configuration
- `/api/campaigns/*` - Email campaigns
- `/api/ai-config/*` - AI provider config
- `/api/integration/*` - External integrations (Chatwoot SSO)
- `/api/dashboard/*` - Dashboard stats

## Key Code Locations

### Backend
- Entry point: `backend/src/index.ts`
- Database: `backend/src/utils/prisma.ts`
- Auth middleware: `backend/src/middleware/auth.ts`
- Tenant isolation: `backend/src/middleware/tenant.ts`
- DataJud: `backend/src/services/datajud.service.ts`
- AI Service: `backend/src/services/ai/ai.service.ts`
- Encryption: `backend/src/utils/encryption.ts`
- Database backup: `backend/src/services/database-backup.service.ts`
- Redis cache: `backend/src/utils/redis.ts`

### Tests
- Test setup: `backend/src/__tests__/setup.ts`
- Multi-tenant tests: `backend/src/__tests__/tenant-isolation.test.ts`
- Auth tests: `backend/src/__tests__/auth.test.ts`
- Health tests: `backend/src/__tests__/health.test.ts`

### Frontend
- Entry: `frontend/src/main.tsx`
- Routing: `frontend/src/App.tsx`
- API client: `frontend/src/services/api.ts`
- Auth store: `frontend/src/contexts/AuthContext.tsx`
- Layout: `frontend/src/components/Layout.tsx`

### Database
- Schema: `backend/prisma/schema.prisma`

## Environment Variables

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars, validated at startup)
- `ENCRYPTION_KEY` - AES-256-CBC encryption (64 hex chars)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - S3 storage
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email
- `DATAJUD_API_KEY` - CNJ DataJud API
- `API_URL`, `FRONTEND_URL` - Service URLs

### Security Variables
- `HEALTH_CHECK_KEY` - Protects `/health/detailed` endpoint from external access
- `REDIS_PASSWORD` - Redis authentication (optional)
- `REDIS_USERNAME` - Redis ACL username (optional, Redis 6+)
- `REDIS_TLS_ENABLED` - Enable TLS for Redis (optional)

### Capacity Configuration (docker-compose.yml)
- Backend: 4 replicas, 15 connections each = 60 total DB connections
- PostgreSQL: max_connections=500
- Redis: 2GB maxmemory with allkeys-lru eviction

## Adding New Features

### New API Endpoint
1. Create controller in `backend/src/controllers/`
2. Create route in `backend/src/routes/`
3. Register in `backend/src/routes/index.ts`

### New Database Table
1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_table_name`

### New Frontend Page
1. Create in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation in `frontend/src/components/Layout.tsx`

## Troubleshooting

**Frontend can't connect to backend:**
- Check backend: `docker service ps advtom_backend`
- Test: `curl -k https://api.advwell.pro/health`

**Database errors:**
- Check: `docker service ps advtom_postgres`
- Test: `docker exec $(docker ps -q -f name=advtom_backend) npx prisma db pull`

**DataJud sync issues:**
- Check DATAJUD_API_KEY in docker-compose.yml
- Backend logs: `docker service logs advtom_backend -f`

**View logs:**
```bash
docker service logs advtom_backend -f
docker service logs advtom_frontend -f
```

## Quick Reference

```bash
# Health check
curl -k https://api.advwell.pro/health

# Detailed health (with key)
curl -H "X-Health-Key: <HEALTH_CHECK_KEY>" https://api.advwell.pro/health/detailed

# Check services
docker stack ps advtom

# Access backend container
docker exec -it $(docker ps -q -f name=advtom_backend) sh

# Run tests
cd backend && npm test
```

## Backup and Restore

### Automatic Backup
- Daily backup at 03:00 to S3 (`backups/database/`)
- 30-day retention with automatic cleanup
- Compressed JSON format (.json.gz)

### Manual Backup (SUPER_ADMIN only)
```bash
# Create backup
curl -X POST -H "Authorization: Bearer <token>" \
  https://api.advwell.pro/api/database-backup/test

# List available backups
curl -H "Authorization: Bearer <token>" \
  https://api.advwell.pro/api/database-backup/list
```

### Restore from Backup (SUPER_ADMIN only)
```bash
# Validate backup (dry-run)
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"backupKey": "backups/database/backup-2025-12-23.json.gz", "dryRun": true}' \
  https://api.advwell.pro/api/database-backup/restore

# Restore backup (WARNING: replaces all data!)
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"backupKey": "backups/database/backup-2025-12-23.json.gz", "dryRun": false}' \
  https://api.advwell.pro/api/database-backup/restore

# Restore specific tables only
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"backupKey": "...", "dryRun": false, "tables": ["clients", "cases"]}' \
  https://api.advwell.pro/api/database-backup/restore
```

## Security Features

### Multi-tenant Isolation
- All data filtered by `companyId` from authenticated user
- `validateTenant` middleware enforces isolation
- SUPER_ADMIN bypasses tenant restrictions
- Test suite: `backend/src/__tests__/tenant-isolation.test.ts`

### Health Check Protection
- `/health` - Public, returns basic status
- `/health/detailed` - Protected by `HEALTH_CHECK_KEY` or internal IP
- Internal IPs (Docker, localhost) can access without key

### Rate Limiting
- Global: 200 requests/15min
- Auth endpoints: 20 requests/15min
- Password reset: 3 requests/hour

## Monitoring

### Prometheus Endpoints
- Node Exporter: `node-exporter:9100`
- Redis Exporter: `redis-exporter:9121`
- Postgres Exporter: `postgres-exporter:9187`
- Prometheus: `prometheus:9090`

### Alert Rules
- Located in `monitoring/prometheus-alerts.yml`
- Alertmanager config: `monitoring/alertmanager.yml`
