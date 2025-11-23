# AdvWell Scaling Guide - 100+ Companies

**Version:** Production v67
**Last Updated:** 2025-01-23
**Target:** 100+ companies with horizontal scaling

---

## Quick Start

### Deploy Production Configuration

```bash
# 1. Copy current env to production config
cp docker-compose.yml docker-compose.yml.backup

# 2. Deploy production stack with PgBouncer and optimizations
docker stack deploy -c docker-compose.production.yml advtom

# 3. Wait for services to be ready (2-3 minutes)
docker service ls

# 4. Verify all services are running
watch -n 2 'docker service ls | grep advtom'
```

### Configure Automated Operations

```bash
# Run the production setup script
./setup-production.sh

# This will configure:
# - Automated S3 backups (daily at 2 AM)
# - Disk space monitoring (hourly)
# - Health checks (every 5 minutes)
```

---

## Horizontal Scaling

### Current Configuration (Production)

| Service | Replicas | Can Scale? | Max Recommended |
|---------|----------|------------|-----------------|
| Backend | 3 | ✅ Yes | 10 |
| Frontend | 2 | ✅ Yes | 5 |
| PgBouncer | 1 | ⚠️ Limited | 2 |
| PostgreSQL | 1 | ❌ No* | 1 master + replicas |
| Redis | 1 | ⚠️ Limited | 1 master + replicas |

*PostgreSQL requires master-replica setup, not simple scaling

### Scaling Commands

#### Scale Backend (for high API load)

```bash
# Scale to 5 replicas
docker service scale advtom_backend=5

# Scale down to 3 replicas
docker service scale advtom_backend=3

# Monitor scaling progress
docker service ps advtom_backend
```

#### Scale Frontend (for high traffic)

```bash
# Scale to 3 replicas
docker service scale advtom_frontend=3

# Check load distribution
docker service logs advtom_frontend -f
```

#### Auto-Scaling Based on Metrics

```bash
# Monitor current resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Scale when:
# - CPU > 70% for 5 minutes → Add 1 replica
# - CPU < 30% for 10 minutes → Remove 1 replica
# - Memory > 80% → Add replica
```

### Recommended Scaling Strategy

| Companies | Backend | Frontend | PgBouncer | Notes |
|-----------|---------|----------|-----------|-------|
| 1-20 | 2 | 1 | 1 | Light load |
| 21-50 | 3 | 2 | 1 | Medium load |
| 51-100 | 5 | 3 | 2 | Heavy load |
| 100-200 | 7 | 4 | 2 | Scale PG too |
| 200+ | 10 | 5 | 3 | Add PG replicas |

---

## Database Scaling

### PgBouncer Configuration (Connection Pooling)

**Current Setup:**
- Max client connections: 1000 (logical)
- Pool size per DB: 25 (physical)
- Pool mode: Transaction (most efficient)

**Benefits:**
- 1000 logical → 25 physical connections
- 97.5% reduction in DB overhead
- Supports 500+ concurrent users

### PostgreSQL Optimizations

**Applied Settings:**
```sql
max_connections = 500        # Up from 100
shared_buffers = 2GB         # Up from 128MB
effective_cache_size = 8GB   # Up from 4GB
work_mem = 16MB              # Up from 4MB
```

**For 100 Companies:**
- Expected queries/sec: 500-1000
- Expected connections: 300-400
- Database size: 5-10 GB
- RAM usage: ~2-4 GB

### Adding PostgreSQL Read Replicas (Advanced)

For 200+ companies, add read replicas:

```yaml
# Add to docker-compose.production.yml
postgres-replica:
  image: postgres:16-alpine
  environment:
    - POSTGRES_MASTER_SERVICE_HOST=postgres
    - POSTGRES_REPLICATION_MODE=slave
    - POSTGRES_REPLICATION_USER=replicator
    - POSTGRES_REPLICATION_PASSWORD=${REPLICATION_PASSWORD}
  volumes:
    - postgres_replica_data:/var/lib/postgresql/data
```

Then route read queries to replica:
- Writes → `postgres` (master)
- Reads → `postgres-replica` (slave)

---

## Load Balancing

### Traefik Configuration

**Already Configured** ✅

Traefik automatically load balances across replicas:

```yaml
# Backend load balancing (from docker-compose.production.yml)
labels:
  - "traefik.http.services.advwell-backend.loadbalancer.server.port=3000"
  - "traefik.http.services.advwell-backend.loadbalancer.healthcheck.path=/health"
  - "traefik.http.services.advwell-backend.loadbalancer.healthcheck.interval=10s"
```

### Health Checks

Backend must respond to `/health`:

```javascript
// Already implemented in backend/src/index.ts
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});
```

### Load Balancing Algorithms

**Current:** Round-robin (default)
**Alternatives:**
- `wrr` - Weighted round-robin
- `leastconn` - Least connections (best for long requests)

To change, add to labels:
```yaml
- "traefik.http.services.advwell-backend.loadbalancer.algorithm=leastconn"
```

---

## Resource Limits

### Per-Service Limits (Production Config)

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| PostgreSQL | 2 cores | 4 GB | 1 core | 2 GB |
| PgBouncer | 0.5 core | 256 MB | 0.25 core | 128 MB |
| Backend (each) | 1 core | 1 GB | 0.5 core | 512 MB |
| Frontend (each) | 0.5 core | 256 MB | 0.25 core | 128 MB |
| Redis | 0.5 core | 1 GB | 0.25 core | 512 MB |

### Total Resource Calculation

**For 100 companies (Backend×5, Frontend×3):**

| Resource | Total | Buffer | Recommended |
|----------|-------|--------|-------------|
| CPU | 10 cores | +20% | 12 cores |
| Memory | 12 GB | +30% | 16 GB |
| Disk | 50 GB | +100% | 100 GB |

**Current Server:** 16GB RAM, Multi-core CPU ✅ SUFFICIENT

---

## Monitoring & Alerts

### Built-in Monitoring

1. **Prometheus** - Metrics collection
   ```bash
   # Access Prometheus UI
   docker service logs advtom_prometheus
   ```

2. **Grafana** - Visualization
   ```bash
   # Access Grafana (configure URL in Traefik)
   # Default password: admin (change in .env)
   ```

3. **Automated Health Checks**
   ```bash
   # Check logs
   tail -f /var/log/advtom-health.log
   ```

### External Monitoring (Recommended)

#### 1. UptimeRobot (Free)

Setup:
1. Go to https://uptimerobot.com
2. Create monitors:
   - `https://api.advwell.pro/health` (5 min interval)
   - `https://app.advwell.pro` (5 min interval)
3. Configure alerts:
   - Email
   - SMS (paid)
   - Webhook

#### 2. Sentry (Error Tracking)

Add to backend:
```bash
cd backend
npm install @sentry/node
```

```javascript
// backend/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

#### 3. Disk Space Alerts

Already configured in `monitor-disk.sh`

To add webhook:
```bash
# Edit monitor-disk.sh
curl -X POST "https://hooks.slack.com/YOUR/WEBHOOK" \
  -d '{"text":"Disk usage: ${USAGE}%"}'
```

---

## Backup & Recovery

### Automated Backups

**Configured** ✅ via `backup-to-s3.sh`

**Schedule:** Daily at 2 AM
**Location:** S3 bucket `s3://advwell-app/database-backups/`
**Retention:** 30 days
**Compression:** gzip (~90% reduction)

### Manual Backup

```bash
# Create immediate backup
/root/advtom/backup-to-s3.sh
```

### Restore from Backup

```bash
# 1. Download backup from S3
aws s3 cp s3://advwell-app/database-backups/advtom_backup_YYYYMMDD_HHMMSS.sql.gz /tmp/

# 2. Stop services
docker service scale advtom_backend=0
docker service scale advtom_frontend=0

# 3. Restore database
gunzip < /tmp/advtom_backup_*.sql.gz | \
  docker exec -i $(docker ps -q -f name=advtom_postgres) \
  psql -U postgres -d advtom

# 4. Restart services
docker service scale advtom_backend=3
docker service scale advtom_frontend=2

# 5. Verify
curl https://api.advwell.pro/health
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 2 hours
**RPO (Recovery Point Objective):** 24 hours (daily backups)

**Steps:**
1. Restore last backup (30 min)
2. Verify data integrity (30 min)
3. Restart services (10 min)
4. Run smoke tests (20 min)
5. Monitor for issues (30 min)

---

## Performance Optimization

### Database Query Optimization

**Monitor slow queries:**
```sql
-- Enable slow query logging (already configured)
-- Queries >1 second are logged

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Redis Caching Strategy

**Use Redis for:**
- User sessions (already implemented)
- Frequently accessed company settings
- Client/case lists (5-minute TTL)
- DataJud sync status

**Example caching pattern:**
```javascript
// Check cache first
const cacheKey = `clients:${companyId}`;
let clients = await redis.get(cacheKey);

if (!clients) {
  // Cache miss - fetch from DB
  clients = await prisma.client.findMany({ where: { companyId } });

  // Store in cache (5 min TTL)
  await redis.setex(cacheKey, 300, JSON.stringify(clients));
}
```

### CDN for Static Assets

**Recommended:** Cloudflare (Free tier)

Setup:
1. Add domain to Cloudflare
2. Enable "Proxy" for app.advwell.pro
3. Configure cache rules:
   - JS/CSS: 7 days
   - Images: 30 days
   - HTML: 1 hour

Benefits:
- 60%+ reduction in server load
- Faster page loads globally
- Built-in DDoS protection

---

## Security at Scale

### Rate Limiting

**Current:** 100 requests / 15 minutes per IP

**For 100 companies:**
```javascript
// Per-user rate limiting (recommended)
const userLimiter = rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip,
  max: 1000, // per user per 15 minutes
  windowMs: 15 * 60 * 1000,
});
```

### WAF (Web Application Firewall)

**Recommended:** Cloudflare (Free tier)

Features:
- DDoS protection
- Bot mitigation
- SQL injection blocking
- XSS protection

### SSL/TLS

**Already configured** ✅ via Let's Encrypt

Auto-renewal via Traefik:
```yaml
# Traefik handles certificate renewal
- "traefik.http.routers.advwell-backend.tls.certresolver=letsencryptresolver"
```

---

## Cost Optimization

### Resource Efficiency

**Current costs for 100 companies:**
- VPS (16GB, 4 CPU): $80/month
- S3 Storage (500GB): $12/month
- Monitoring (Sentry): $26/month
- **Total:** ~$120/month

**Cost per company:** $1.20/month 🎯

### Scaling Cost Projections

| Companies | VPS | S3 | Monitoring | Total/mo | Cost/company |
|-----------|-----|----|-----------|----|---|
| 50 | $80 | $6 | $0 | $86 | $1.72 |
| 100 | $80 | $12 | $26 | $118 | $1.18 |
| 200 | $160 | $25 | $26 | $211 | $1.06 |
| 500 | $240 | $60 | $52 | $352 | $0.70 |

**Economies of scale** ✅ Cost per company decreases as you grow

---

## Operational Commands

### Daily Operations

```bash
# Check service health
docker service ls | grep advtom

# View logs
docker service logs advtom_backend -f --tail 100

# Check resource usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Verify backups
aws s3 ls s3://advwell-app/database-backups/ --human-readable
```

### Scaling Operations

```bash
# Scale up (more companies)
docker service scale advtom_backend=5
docker service scale advtom_frontend=3

# Scale down (cost optimization)
docker service scale advtom_backend=2
docker service scale advtom_frontend=1

# Update to new version (zero-downtime)
docker service update --image tomautomations/advwell-backend:v53 advtom_backend
```

### Emergency Operations

```bash
# Restart stuck service
docker service update --force advtom_backend

# Rollback to previous version
docker service rollback advtom_backend

# View all service events
docker service ps advtom_backend --no-trunc
```

---

## Troubleshooting

### High CPU Usage

**Symptoms:** CPU > 80% for 10+ minutes

**Solutions:**
1. Scale horizontally: `docker service scale advtom_backend=5`
2. Check slow queries in PostgreSQL
3. Verify no infinite loops in code
4. Check if cron jobs are running during peak hours

### Memory Leaks

**Symptoms:** Memory gradually increasing, eventual OOM

**Solutions:**
1. Restart service: `docker service update --force advtom_backend`
2. Check for unclosed database connections
3. Review Redis memory usage: `docker exec redis redis-cli INFO memory`
4. Enable memory profiling in Node.js

### Database Connection Exhaustion

**Symptoms:** "too many connections" errors

**Solutions:**
1. Verify PgBouncer is running: `docker service ps advtom_pgbouncer`
2. Check PgBouncer stats: `docker exec pgbouncer psql -p 6432 -U postgres pgbouncer -c "SHOW POOLS"`
3. Increase max_connections in PostgreSQL (already at 500)
4. Check for connection leaks in application code

### Disk Full

**Symptoms:** Services crash, can't write logs

**Solutions:**
1. Clean Docker: `docker system prune -a --volumes`
2. Clean old backups: `find /root/advtom/backups -mtime +7 -delete`
3. Remove old logs: `truncate -s 0 /var/log/advtom-*.log`
4. Add disk space to server

---

## Success Metrics

### Monitor These KPIs

| Metric | Target | Alert If |
|--------|--------|----------|
| API Response Time | <300ms | >500ms |
| Error Rate | <0.1% | >1% |
| Uptime | >99.9% | <99% |
| Database CPU | <70% | >80% |
| Disk Usage | <70% | >80% |
| Active Companies | Growing | Decreasing |

### Capacity Planning

**Current capacity:** 100-150 companies

**Upgrade triggers:**
- 80+ companies → Scale backend to 5 replicas
- 120+ companies → Add second server node
- 200+ companies → Add PostgreSQL read replica

---

## Next Steps

1. **Deploy production config:**
   ```bash
   docker stack deploy -c docker-compose.production.yml advtom
   ```

2. **Run setup script:**
   ```bash
   ./setup-production.sh
   ```

3. **Verify everything:**
   ```bash
   docker service ls
   docker service ps advtom_backend
   curl https://api.advwell.pro/health
   ```

4. **Set up external monitoring:**
   - UptimeRobot
   - Sentry
   - Cloudflare

5. **Test scaling:**
   ```bash
   docker service scale advtom_backend=5
   # Monitor for 30 minutes
   docker stats
   ```

**System is ready for 100+ companies!** 🚀

---

**Last Updated:** 2025-01-23
**Maintained by:** DevOps Team
**Questions:** Check logs first, then review this guide
