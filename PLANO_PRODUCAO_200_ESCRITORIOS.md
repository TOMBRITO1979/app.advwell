# PLANO DE PRODUÇÃO - ADVWELL 200 ESCRITÓRIOS

## Status do Projeto

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROGRESSO GERAL: 98% CONCLUÍDO                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Fase 1: Preparação VPS        [##########] 100% ✓ CONCLUÍDO            │
│  Fase 2: Migração PostgreSQL   [##########] 100% ✓ CONCLUÍDO            │
│  Fase 3: Otimizações           [##########] 100% ✓ CONCLUÍDO            │
│  Fase 4: Segurança             [######### ]  90% ◐ FALTA REVOGAR TOKENS │
│  Fase 5: Backups               [##########] 100% ✓ CONCLUÍDO            │
│  Fase 6: Monitoramento         [##########] 100% ✓ CONCLUÍDO            │
│  Fase 7: Escalabilidade        [##########] 100% ✓ CONCLUÍDO            │
│  Fase 8: Documentação          [##########] 100% ✓ CONCLUÍDO            │
└─────────────────────────────────────────────────────────────────────────┘

Última atualização: 2026-01-04 21:50
```

---

## Arquitetura IMPLEMENTADA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SERVIDOR PRINCIPAL (5.161.98.0)                      │
│                    8 vCPUs | 30GB RAM | 150GB SSD                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Traefik    │  │   Backend    │  │   Backend    │  │   Backend    │ │
│  │   (Proxy)    │  │  Replica 1   │  │  Replica 2   │  │  Replica 3   │ │
│  │   + SSL      │  │   1.5GB      │  │   1.5GB      │  │   1.5GB      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │   Frontend   │  │  Prometheus  │  │      Redis Sentinel          │   │
│  │   1 Replica  │  │  + Grafana   │  │  Master + Replica + 3 Sent   │   │
│  │    512MB     │  │  Alertmanager│  │        2GB Total             │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Conexão: 5432 (85ms latência)
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                    VPS DEDICADA PostgreSQL (5.78.137.1)                  │
│                    4 vCPUs | 16GB RAM | 80GB SSD                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL 16 (Dedicado) ✓                    │   │
│  │                                                                    │   │
│  │  max_connections = 500           shared_buffers = 4GB             │   │
│  │  effective_cache_size = 12GB     work_mem = 64MB                  │   │
│  │  maintenance_work_mem = 1GB      wal_buffers = 64MB               │   │
│  │                                                                    │   │
│  │  + pg_stat_statements (monitoring) ✓                              │   │
│  │  + Backup automático S3 (03:00) ✓                                 │   │
│  │  + Node Exporter (9100) ✓                                         │   │
│  │  + Postgres Exporter (9187) ✓                                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Preparação da Nova VPS ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Provisionar VPS Hetzner | ✓ | 4 vCPUs, 16GB RAM (maior que planejado) |
| Instalar Docker | ✓ | Docker 27.5.0 |
| Configurar Firewall | ✓ | UFW: SSH + PostgreSQL (5.161.98.0 only) |
| Configurar hostname | ✓ | advwell-db |

### Configuração do Firewall Implementada:
```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 5432                       ALLOW IN    5.161.98.0
[ 3] 9100                       ALLOW IN    5.161.98.0    # Node Exporter
[ 4] 9187                       ALLOW IN    5.161.98.0    # Postgres Exporter
```

---

## FASE 2: Migração do PostgreSQL ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Criar docker-compose.yml | ✓ | PostgreSQL 16 otimizado |
| Migrar dados | ✓ | pg_dump/pg_restore |
| Atualizar DATABASE_URL | ✓ | Apontando para 5.78.137.1 |
| Verificar integridade | ✓ | Todos os dados íntegros |
| Desativar PostgreSQL local | ✓ | Comentado no docker-compose |

### Dados Migrados:
```
     tabela      | registros
-----------------+-----------
 companies       |        10
 users           |        21
 clients         |        35
 cases           |        31
 schedule_events |        78
```

### docker-compose.yml na VPS DB:
```yaml
# /root/advwell-db/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: advwell-postgres
    environment:
      - POSTGRES_DB=advtom
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    ports:
      - "0.0.0.0:5432:5432"
    command:
      - "postgres"
      - "-c" "max_connections=500"
      - "-c" "shared_buffers=4GB"
      - "-c" "effective_cache_size=12GB"
      - "-c" "work_mem=64MB"
      - "-c" "maintenance_work_mem=1GB"
      ...
    deploy:
      resources:
        limits:
          memory: 12G
```

---

## FASE 3: Otimizações do Servidor Principal ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Atualizar DATABASE_URL | ✓ | postgresql://...@5.78.137.1:5432 |
| Remover PostgreSQL local | ✓ | Comentado, ~3GB RAM liberado |
| Aumentar replicas backend | ✓ | 3 replicas ativas |
| Aumentar Redis memory | ✓ | maxmemory=2GB |
| Migration ScheduleEventGoogleSync | ✓ | Tabela criada |

### Configuração Atual:
- Backend: 3 replicas x 25 conexões = 75 conexões DB
- Redis: 2GB maxmemory (era 1.5GB)
- Conexões disponíveis: 425 (de 500)

---

## FASE 4: Segurança 10/10 ◐ EM PROGRESSO

### Status: 90% Concluído

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Revogar tokens GitHub/DockerHub | ⚠️ | PENDENTE - Usuário vai revogar manualmente |
| Configurar Fail2Ban VPS Principal | ✓ | Ativo, 7 IPs banidos |
| Configurar Fail2Ban VPS PostgreSQL | ✓ | Ativo, 3 IPs banidos |
| SSH sem senha entre VPS | ✓ | Chave configurada |
| Rate limiting | ✓ | Já configurado |
| CSRF protection | ✓ | Já configurado |

### AÇÃO PENDENTE DO USUÁRIO:
```bash
# Tokens que precisam ser revogados:
# - GitHub: https://github.com/settings/tokens
# - DockerHub: https://hub.docker.com/settings/security
```

### Fail2Ban Status:
```
VPS Principal (5.161.98.0):    7 IPs banidos ✓
VPS PostgreSQL (5.78.137.1):   3 IPs banidos ✓
```

---

## FASE 5: Backups 10/10 ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Backup local PostgreSQL | ✓ | Diário 03:00, 7 dias retenção |
| Backup S3 | ✓ | Diário 03:00, 30 dias retenção |
| Script de restore | ✓ | Testado e funcionando |
| Teste de restore | ✓ | 100% dados recuperados |

### Sistema de Backup Implementado:
```
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP DUPLO ATIVO                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. POSTGRESQL VPS (03:00)                                  │
│     Script: /root/advwell-db/scripts/backup.sh              │
│     Local: /root/advwell-db/backups/ (7 dias)              │
│     S3: s3://advwell-app/backups/postgresql/ (30 dias)     │
│     Formato: pg_dump SQL comprimido (.sql.gz)              │
│                                                              │
│  2. BACKEND APP (06:00)                                     │
│     Endpoint: /api/database-backup/                         │
│     S3: s3://advwell-app/backups/database/ (30 dias)       │
│     Formato: JSON comprimido (.json.gz)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Teste de Restore (2026-01-04):
```
┌────────────────────────────────────────┐
│  ANTES DO RESTORE                      │
├────────────────────────────────────────┤
│  companies:        10                  │
│  users:            21                  │
│  clients:          35                  │
│  cases:            31                  │
│  schedule_events:  78                  │
├────────────────────────────────────────┤
│  DEPOIS DO RESTORE                     │
├────────────────────────────────────────┤
│  companies:        10  ✓               │
│  users:            21  ✓               │
│  clients:          35  ✓               │
│  cases:            31  ✓               │
│  schedule_events:  78  ✓               │
├────────────────────────────────────────┤
│  Tempo de restore: ~15 segundos        │
│  API após restore: healthy ✓           │
└────────────────────────────────────────┘
```

### Comandos de Backup/Restore:
```bash
# Backup manual
/root/advwell-db/scripts/backup.sh

# Listar backups
/root/advwell-db/scripts/restore.sh

# Restore
docker service scale advtom_backend=0
/root/advwell-db/scripts/restore.sh pg_backup_XXXX.sql.gz
docker service scale advtom_backend=2
```

---

## FASE 6: Monitoramento 10/10 ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Node Exporter VPS | ✓ | Porta 9100 |
| Postgres Exporter VPS | ✓ | Porta 9187 |
| Prometheus config | ✓ | Scraping ambas VPS |
| Alertas PostgreSQL VPS | ✓ | 7 alertas configurados |
| Dashboard Grafana | ✓ | PostgreSQL VPS Dedicada |

### Targets Prometheus:
```
VPS PRINCIPAL (5.161.98.0):
  node                 node-exporter:9100             [UP]
  postgres             postgres-exporter:9187         [UP]
  prometheus           localhost:9090                 [UP]
  redis                redis-exporter:9121            [UP]

VPS DEDICADA (5.78.137.1):
  node-postgres-vps    5.78.137.1:9100                [UP]
  postgres-dedicated   5.78.137.1:9187                [UP]
```

### Alertas Configurados para VPS PostgreSQL:
| Alerta | Condição | Severidade |
|--------|----------|------------|
| PostgresVPSDown | pg_up == 0 | critical |
| PostgresVPSMemoryHigh | RAM > 80% | warning |
| PostgresVPSMemoryCritical | RAM > 90% | critical |
| PostgresVPSDiskHigh | Disco > 80% | warning |
| PostgresVPSCPUHigh | CPU > 80% | warning |
| PostgresVPSConnectionsHigh | Conexões > 400 | warning |
| PostgresVPSUnreachable | Sem conexão | critical |

### Dashboard Grafana:
- **URL**: https://grafana.advwell.pro/d/postgresql-vps-dashboard
- **Painéis**: 25
- **Métricas**: PostgreSQL + Sistema (CPU, RAM, Disco, Network)

---

## FASE 7: Escalabilidade 10/10 ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| Load test básico | ✓ | 830 req/s, 0 falhas |
| Documentar limites | ✓ | docs/CAPACITY_LIMITS.md |
| Monitorar headroom | ✓ | CPU 6%, RAM 8.6%, muito espaço |

### Resultados do Load Test:
```
┌─────────────────────────────────────────────────────────────┐
│  TESTE DE CARGA (2026-01-04)                                │
├─────────────────────────────────────────────────────────────┤
│  Requests:          5.000                                   │
│  Concorrência:      200                                     │
│  Throughput:        830 req/s                               │
│  Falhas:            0                                       │
│  Latência p50:      236ms                                   │
│  Latência p99:      484ms                                   │
├─────────────────────────────────────────────────────────────┤
│  CPU durante teste: 6%                                      │
│  RAM durante teste: 2.6GB / 30GB                            │
│  Load Average:      0.52                                    │
└─────────────────────────────────────────────────────────────┘
```

### Capacidade Validada:
- **Backend**: 3 replicas × 25 conexões = 75 conexões DB
- **PostgreSQL**: max_connections = 500 (425 disponíveis)
- **Capacidade**: 150-200 escritórios com configuração atual
- **Escalável para**: 400+ escritórios com 6 replicas

---

## FASE 8: Documentação e Runbooks ✓ CONCLUÍDO

### Status: 100% Concluído em 2026-01-04

| Tarefa | Status | Observações |
|--------|--------|-------------|
| README VPS DB | ✓ | /root/advwell-db/README.md |
| CLAUDE.md atualizado | ✓ | Documentação principal |
| Runbooks operacionais | ✓ | docs/RUNBOOKS.md |
| Checklist de deploy | ✓ | docs/DEPLOY_CHECKLIST.md |
| Limites de capacidade | ✓ | docs/CAPACITY_LIMITS.md |

### Documentação Criada:
- **docs/RUNBOOKS.md**: Procedimentos para troubleshooting de Backend, PostgreSQL, Redis, Backup/Restore, Segurança
- **docs/DEPLOY_CHECKLIST.md**: Checklist completo para deploys seguros
- **docs/CAPACITY_LIMITS.md**: Limites de capacidade e resultados de load test

---

## PRÓXIMOS PASSOS

### Pendente do Usuário (ÚNICA TAREFA RESTANTE):
1. **Revogar tokens GitHub e DockerHub** expostos:
   - GitHub: https://github.com/settings/tokens
   - DockerHub: https://hub.docker.com/settings/security

### Melhorias Futuras (Opcional):
2. Configurar backup offsite (Hetzner Storage Box)
3. Implementar auto-scaling rules
4. Configurar replicação PostgreSQL (standby)
5. Adicionar mais replicas backend se necessário

---

## MÉTRICAS ATUAIS (2026-01-04 21:45)

```
┌─────────────────────────────────────────────────────────────┐
│                    MÉTRICAS DO SISTEMA                       │
├─────────────────────────────────────────────────────────────┤
│  VPS PRINCIPAL (5.161.98.0)                                  │
│    CPU:              6% (load 0.52)                         │
│    Memória:          2.6GB / 30GB (8.6%)                    │
│    Backend:          3 replicas ✓                           │
│    Redis:            2GB maxmem                             │
│    Fail2Ban:         7 IPs banidos ✓                        │
│                                                              │
│  VPS PostgreSQL (5.78.137.1)                                │
│    Status:           UP ✓                                   │
│    Conexões:         ~10 / 500                              │
│    Cache Hit:        99.79%                                 │
│    Memória:          ~20%                                   │
│                                                              │
│  API                                                         │
│    Health:           healthy ✓                              │
│    Throughput:       830 req/s (testado)                    │
│    Latência p50:     236ms                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## RESULTADO ATUAL vs ESPERADO

| Área | Antes | Atual | Meta |
|------|-------|-------|------|
| Banco de Dados | 8/10 | **10/10** ✓ | 10/10 |
| Backups | 8/10 | **10/10** ✓ | 10/10 |
| Monitoramento | 7/10 | **10/10** ✓ | 10/10 |
| CORS e Segurança | 9/10 | **10/10** ✓ | 10/10 |
| Segurança Tokens | 9/10 | **8/10** ⚠️ | 10/10 |
| Escalabilidade | 6/10 | **10/10** ✓ | 10/10 |
| Documentação | 5/10 | **10/10** ✓ | 10/10 |

**Nota**: Segurança Tokens será 10/10 após usuário revogar os tokens expostos.

---

## COMANDOS ÚTEIS

```bash
# === VPS PRINCIPAL (5.161.98.0) ===

# Ver status dos serviços
docker service ls

# Escalar backend
docker service scale advtom_backend=3

# Ver logs
docker service logs advtom_backend -f --tail 100

# === VPS POSTGRESQL (5.78.137.1) ===

# Conectar via SSH
ssh root@5.78.137.1

# Ver containers
docker ps

# Backup manual
/root/advwell-db/scripts/backup.sh

# Listar backups
ls -la /root/advwell-db/backups/

# Ver conexões PostgreSQL
docker exec advwell-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Ver logs PostgreSQL
docker logs advwell-postgres -f --tail 100
```

---

## CUSTOS ATUAIS

| Item | Custo Mensal |
|------|--------------|
| VPS Principal (existente) | ~€XX |
| VPS PostgreSQL Dedicada (4vCPU/16GB) | ~€15-20 |
| S3 Storage | ~€1-2 |
| **Total adicional** | **~€17-22/mês** |
