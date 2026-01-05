# AdvWell - Runbooks Operacionais

## Sumario

1. [Monitoramento e Alertas](#1-monitoramento-e-alertas)
2. [Troubleshooting Backend](#2-troubleshooting-backend)
3. [Troubleshooting PostgreSQL](#3-troubleshooting-postgresql)
4. [Troubleshooting Redis](#4-troubleshooting-redis)
5. [Backup e Restore](#5-backup-e-restore)
6. [Escalabilidade](#6-escalabilidade)
7. [Incidentes de Seguranca](#7-incidentes-de-seguranca)

---

## 1. Monitoramento e Alertas

### URLs de Monitoramento
- **Grafana**: https://grafana.advwell.pro
- **Prometheus**: http://localhost:9090 (apenas interno)
- **API Health**: https://api.advwell.pro/health

### Verificar Status dos Servicos
```bash
# Ver todos os servicos
docker service ls

# Ver status de um servico especifico
docker service ps advtom_backend

# Ver logs em tempo real
docker service logs advtom_backend -f --tail 100
```

### Alertas Ativos
```bash
# Via Prometheus
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | {alertname: .labels.alertname, state: .state}'

# Via Alertmanager
curl -s http://localhost:9093/api/v1/alerts | jq
```

---

## 2. Troubleshooting Backend

### Backend nao esta respondendo

**Sintomas**: API retorna 502/503, health check falhando

**Passos**:
```bash
# 1. Verificar status das replicas
docker service ps advtom_backend

# 2. Ver logs de erro
docker service logs advtom_backend --tail 200 2>&1 | grep -i error

# 3. Verificar conectividade com banco
docker exec $(docker ps -q -f name=advtom_backend | head -1) \
  npx prisma db pull --print 2>&1 | head -5

# 4. Verificar conectividade com Redis
docker exec $(docker ps -q -f name=advtom_backend | head -1) \
  redis-cli -h redis -a $REDIS_PASSWORD ping

# 5. Reiniciar o servico (se necessario)
docker service update --force advtom_backend
```

### Alta Latencia

**Sintomas**: Requests demorando mais de 2 segundos

**Passos**:
```bash
# 1. Verificar carga do sistema
uptime
htop

# 2. Verificar conexoes do banco
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c \"SELECT count(*) FROM pg_stat_activity;\""

# 3. Verificar queries lentas (log do PostgreSQL)
ssh root@5.78.137.1 "docker logs advwell-postgres 2>&1 | grep duration | tail -20"

# 4. Verificar memoria Redis
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) redis-cli -a $REDIS_PASSWORD INFO memory | grep used_memory_human
```

### Container Reiniciando

**Sintomas**: Replica count oscilando, restarts frequentes

**Passos**:
```bash
# 1. Ver historico de restarts
docker service ps advtom_backend --no-trunc

# 2. Ver logs do container que falhou
docker logs $(docker ps -a -q -f name=advtom_backend | head -1) 2>&1 | tail -50

# 3. Verificar limites de memoria
docker stats --no-stream $(docker ps -q -f name=advtom_backend)

# 4. Se for OOM, considerar aumentar limite
# Editar docker-compose.yml: resources.limits.memory
```

---

## 3. Troubleshooting PostgreSQL

### VPS PostgreSQL: 5.78.137.1

### Banco nao conecta

**Sintomas**: Error P1001, connection refused

**Passos**:
```bash
# 1. Verificar se container esta rodando
ssh root@5.78.137.1 "docker ps -f name=advwell-postgres"

# 2. Verificar logs do PostgreSQL
ssh root@5.78.137.1 "docker logs advwell-postgres --tail 50"

# 3. Verificar conectividade de rede
nc -zv 5.78.137.1 5432

# 4. Verificar firewall na VPS
ssh root@5.78.137.1 "ufw status"

# 5. Reiniciar PostgreSQL (se necessario)
ssh root@5.78.137.1 "docker restart advwell-postgres"
```

### Muitas conexoes

**Sintomas**: Error "too many connections", lentidao

**Passos**:
```bash
# 1. Ver conexoes atuais
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c \"
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
\""

# 2. Ver conexoes por aplicacao
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c \"
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;
\""

# 3. Matar conexoes idle antigas (mais de 30 min)
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c \"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '30 minutes';
\""
```

### Disco cheio

**Sintomas**: Erros de escrita, PANIC no log

**Passos**:
```bash
# 1. Verificar espaco
ssh root@5.78.137.1 "df -h"

# 2. Verificar tamanho dos dados
ssh root@5.78.137.1 "du -sh /root/advwell-db/data/"

# 3. Limpar WAL antigos (com cuidado!)
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c 'CHECKPOINT;'"

# 4. Limpar backups antigos
ssh root@5.78.137.1 "find /root/advwell-db/backups -mtime +7 -delete"

# 5. Vacuum para recuperar espaco
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c 'VACUUM FULL ANALYZE;'"
```

---

## 4. Troubleshooting Redis

### Redis nao conecta

**Sintomas**: Error ECONNREFUSED, timeout

**Passos**:
```bash
# 1. Verificar status
docker service ps advtom_redis

# 2. Verificar logs
docker service logs advtom_redis --tail 30

# 3. Testar conexao direta
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) redis-cli -a $REDIS_PASSWORD ping

# 4. Verificar Sentinels
for i in 1 2 3; do
  echo "=== Sentinel $i ==="
  docker exec $(docker ps -q -f name=advtom_redis-sentinel-$i | head -1) \
    redis-cli -p 26379 -a $REDIS_PASSWORD SENTINEL master mymaster 2>/dev/null | head -10
done
```

### Redis usando muita memoria

**Sintomas**: Alerta de memoria alta, evictions

**Passos**:
```bash
# 1. Verificar uso atual
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) \
  redis-cli -a $REDIS_PASSWORD INFO memory

# 2. Ver chaves grandes
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) \
  redis-cli -a $REDIS_PASSWORD --bigkeys

# 3. Limpar cache se necessario
# CUIDADO: Isso vai limpar todo o cache
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) \
  redis-cli -a $REDIS_PASSWORD FLUSHDB

# 4. Verificar evictions
docker exec $(docker ps -q -f name=advtom_redis.1 | head -1) \
  redis-cli -a $REDIS_PASSWORD INFO stats | grep evicted
```

---

## 5. Backup e Restore

### Backup Manual

```bash
# Na VPS PostgreSQL (5.78.137.1)
ssh root@5.78.137.1 "/root/advwell-db/scripts/backup.sh"

# Verificar backup criado
ssh root@5.78.137.1 "ls -la /root/advwell-db/backups/"

# Verificar upload para S3
aws s3 ls s3://advwell-app/backups/postgresql/ --recursive | tail -5
```

### Restore (PROCEDIMENTO CRITICO)

```bash
# 1. PARAR O BACKEND PRIMEIRO
docker service scale advtom_backend=0

# 2. Esperar containers pararem
sleep 30

# 3. Na VPS PostgreSQL, executar restore
ssh root@5.78.137.1 "/root/advwell-db/scripts/restore.sh pg_backup_XXXXXX.sql.gz"

# 4. Verificar integridade
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -d advtom -c \"
SELECT 'companies' as table, count(*) FROM companies
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'cases', count(*) FROM cases;
\""

# 5. Iniciar backend novamente
docker service scale advtom_backend=3

# 6. Verificar health
curl https://api.advwell.pro/health
```

### Download de Backup do S3

```bash
# Listar backups disponiveis
aws s3 ls s3://advwell-app/backups/postgresql/

# Baixar backup especifico
aws s3 cp s3://advwell-app/backups/postgresql/pg_backup_XXXXX.sql.gz /tmp/
```

---

## 6. Escalabilidade

### Aumentar Replicas do Backend

```bash
# Verificar uso atual
docker service ls | grep backend

# Aumentar para N replicas
docker service scale advtom_backend=N

# Ou via deploy
# Editar docker-compose.yml: replicas: N
./deploy.sh
```

### Limites Recomendados

| Componente | Atual | Maximo Recomendado |
|------------|-------|-------------------|
| Backend replicas | 3 | 6 |
| Conexoes DB por replica | 25 | 25 |
| Total conexoes DB | 75 | 150 |
| Redis memoria | 2GB | 3GB |
| PostgreSQL conexoes | 500 | 500 |

### Sinais de que precisa escalar

1. **CPU > 80%** por mais de 5 minutos
2. **Load average > 4** (100% dos cores)
3. **Memoria > 85%**
4. **Latencia API > 500ms** consistentemente
5. **PostgreSQL conexoes > 300**

---

## 7. Incidentes de Seguranca

### Ataque de Forca Bruta detectado

**Sintomas**: Muitos IPs banidos no Fail2Ban

**Passos**:
```bash
# 1. Verificar IPs banidos
fail2ban-client status sshd

# 2. Ver log de tentativas
journalctl -u sshd | grep "Failed password" | tail -50

# 3. Banir IP manualmente se necessario
fail2ban-client set sshd banip <IP>

# 4. Verificar se ha IPs suspeitos com conexao ativa
ss -tunapl | grep ESTABLISHED
```

### Tokens/Credenciais vazados

**ACOES IMEDIATAS**:

1. **Revogar tokens**:
   - GitHub: https://github.com/settings/tokens
   - DockerHub: https://hub.docker.com/settings/security

2. **Rotacionar senhas**:
   ```bash
   # Gerar nova senha segura
   openssl rand -base64 32

   # Atualizar no .env
   vi /root/advwell/.env

   # Re-deploy
   ./deploy.sh
   ```

3. **Verificar acessos suspeitos**:
   ```bash
   # Logs de autenticacao
   journalctl -u sshd | grep "Accepted" | tail -50

   # Acessos ao Docker
   docker events --since "24h" | grep login
   ```

### Servico comprometido

**Passos de Isolamento**:

```bash
# 1. Parar o servico imediatamente
docker service scale advtom_backend=0

# 2. Preservar logs para investigacao
docker service logs advtom_backend > /tmp/incident_logs_$(date +%Y%m%d).txt 2>&1

# 3. Verificar processos suspeitos
ps aux | grep -v docker | grep -v root

# 4. Verificar conexoes de rede suspeitas
netstat -tunapl | grep ESTABLISHED

# 5. Notificar equipe e iniciar investigacao
```

---

## Contatos de Emergencia

| Responsavel | Tipo | Contato |
|------------|------|---------|
| Admin Principal | Tecnico | appadvwell@gmail.com |
| Hetzner Support | Infra | https://console.hetzner.cloud |
| AWS Support | Backup/S3 | https://console.aws.amazon.com |

---

*Ultima atualizacao: 2026-01-04*
