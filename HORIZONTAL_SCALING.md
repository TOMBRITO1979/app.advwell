# Escalabilidade Horizontal (Multi-VPS)

## Sistema: AdvWell SaaS
## Data: 2025-12-24

---

## Status dos Componentes

| Componente | Status | Observação |
|------------|--------|------------|
| Bull Queues | ✅ Pronto | Usa `createRedisClient()` com suporte Sentinel |
| Leader Election | ✅ Pronto | Baseado em Redis, não depende de Docker local |
| Redis Sentinel | ✅ Pronto | Funciona via overlay network do Swarm |
| PostgreSQL | ✅ Pronto | Conexão via overlay network |

---

## Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                      VPS MANAGER                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Backend 1│ │Backend 2│ │Backend 3│ │Backend 4│           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │           │           │           │                  │
│       └───────────┴─────┬─────┴───────────┘                  │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │              Redis Sentinel (3x)             │            │
│  │     ┌─────────┐  ┌─────────┐  ┌─────────┐   │            │
│  │     │Sentinel1│  │Sentinel2│  │Sentinel3│   │            │
│  │     └────┬────┘  └────┬────┘  └────┬────┘   │            │
│  │          └────────────┼────────────┘        │            │
│  │                  ┌────┴────┐                │            │
│  │                  │  Redis  │                │            │
│  │                  │ Master  │                │            │
│  │                  └────┬────┘                │            │
│  │                  ┌────┴────┐                │            │
│  │                  │  Redis  │                │            │
│  │                  │ Replica │                │            │
│  │                  └─────────┘                │            │
│  └─────────────────────────────────────────────┘            │
│                         │                                    │
│                  ┌──────┴──────┐                            │
│                  │ PostgreSQL  │                            │
│                  │ (500 conn)  │                            │
│                  └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Multi-VPS (Docker Swarm)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│      VPS MANAGER        │     │      VPS WORKER 1       │
│  ┌─────────┐ ┌────────┐ │     │  ┌─────────┐ ┌────────┐ │
│  │Backend 1│ │Backend2│ │     │  │Backend 5│ │Backend6│ │
│  └────┬────┘ └───┬────┘ │     │  └────┬────┘ └───┬────┘ │
│       └──────────┤      │     │       └──────────┤      │
│                  │      │     │                  │      │
│  ┌───────────────┴────┐ │     │                  │      │
│  │  Redis + Sentinel  │◄├─────┼──────────────────┘      │
│  │  PostgreSQL        │ │     │                         │
│  └────────────────────┘ │     │                         │
└─────────────────────────┘     └─────────────────────────┘
         │                                │
         └────────── Overlay Network ─────┘
                   (network_public)
```

---

## Passo a Passo: Adicionar Worker VPS

### 1. Preparar a Nova VPS

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Adicionar usuário ao grupo docker (opcional)
sudo usermod -aG docker $USER
```

### 2. Obter Token do Swarm (no Manager)

```bash
# Executar no VPS MANAGER
docker swarm join-token worker
```

Saída esperada:
```
To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-xxx <MANAGER_IP>:2377
```

### 3. Ingressar no Swarm (na Nova VPS)

```bash
# Executar na nova VPS
docker swarm join --token SWMTKN-1-xxx <MANAGER_IP>:2377
```

### 4. Verificar Nodes (no Manager)

```bash
docker node ls
```

Saída esperada:
```
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS
abc123 *                      manager    Ready     Active         Leader
def456                        worker1    Ready     Active
```

### 5. Escalar Backend

```bash
# Aumentar réplicas do backend
docker service scale advtom_backend=8

# Verificar distribuição
docker service ps advtom_backend
```

---

## Configurações Importantes

### Variáveis de Ambiente (já configuradas)

```yaml
# Redis Sentinel (funciona automaticamente via overlay network)
REDIS_SENTINEL_ENABLED: true
REDIS_SENTINELS: redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
REDIS_MASTER_NAME: mymaster

# Leader Election (funciona automaticamente)
# Apenas 1 instância executa cron jobs, independente da VPS
```

### Workers Dedicados (Opcional)

Para VPS que só processam filas (sem cron jobs):

```yaml
# Adicionar ao docker-compose do worker
environment:
  - ENABLE_CRON=false  # Desabilita cron jobs nesta instância
```

---

## Firewall (se necessário)

Se as VPS estiverem em redes diferentes, liberar portas:

```bash
# No Manager - liberar para IPs dos workers
ufw allow from <WORKER_IP> to any port 2377  # Swarm management
ufw allow from <WORKER_IP> to any port 7946  # Swarm communication
ufw allow from <WORKER_IP> to any port 4789  # Overlay network (UDP)
```

---

## Capacidade por VPS

| Componente | Por Réplica | 4 Réplicas | 8 Réplicas |
|------------|-------------|------------|------------|
| Conexões DB | 15 | 60 | 120 |
| Memória Backend | 2GB | 8GB | 16GB |
| CPU Backend | 1 core | 4 cores | 8 cores |

**Limite PostgreSQL:** 500 conexões (suporta até ~33 réplicas)

---

## Monitoramento Multi-VPS

### Verificar Saúde

```bash
# Status dos serviços
docker service ls

# Distribuição das réplicas
docker service ps advtom_backend

# Logs de uma réplica específica
docker service logs advtom_backend --follow --tail 100
```

### Prometheus/Grafana

Os exporters já coletam métricas de todas as VPS automaticamente via overlay network.

---

## Rollback

Se precisar remover um worker:

```bash
# Na VPS worker
docker swarm leave

# No manager (forçar remoção se necessário)
docker node rm <NODE_ID> --force
```

---

## Checklist Pre-Scaling

- [ ] VPS worker tem Docker instalado
- [ ] Firewall permite comunicação Swarm (portas 2377, 7946, 4789)
- [ ] Token do Swarm obtido do manager
- [ ] Overlay network `network_public` acessível
- [ ] Recursos suficientes (mín. 4GB RAM, 2 cores por 2 réplicas)

---

## Suporte

Em caso de problemas:
1. Verificar logs: `docker service logs advtom_backend -f`
2. Verificar conectividade Redis: `docker exec <container> redis-cli -h redis ping`
3. Verificar nodes: `docker node ls`
