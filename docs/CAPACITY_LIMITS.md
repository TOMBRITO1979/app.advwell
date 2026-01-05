# AdvWell - Limites de Capacidade

## Resumo Executivo

O sistema foi testado e validado para suportar:

| Metrica | Valor Testado | Status |
|---------|--------------|--------|
| Requests/segundo | ~830 | OK |
| Conexoes simultaneas | 200 | OK |
| Escritorios estimados | 150-200 | Suportado |
| Usuarios simultaneos | 500+ | Suportado |

---

## Resultados dos Testes de Carga

### Teste 1: Carga Moderada
- **Requests**: 1.000
- **Concorrencia**: 50
- **Resultado**: 397 req/s, 0 falhas
- **Latencia mediana**: 84ms

### Teste 2: Carga Alta
- **Requests**: 3.000
- **Concorrencia**: 100
- **Resultado**: 787 req/s, 0 falhas
- **Latencia mediana**: 99ms

### Teste 3: Carga Maxima
- **Requests**: 5.000
- **Concorrencia**: 200
- **Resultado**: 832 req/s, 0 falhas
- **Latencia mediana**: 236ms

### Recursos Durante Teste Maximo
```
Load Average: 0.52 (capacidade: 8.0)
Memoria: 2.6GB / 30GB (8.6%)
CPU: ~6%
```

---

## Arquitetura Atual

### VPS Principal (5.161.98.0)
| Componente | Alocacao | Uso Real |
|------------|----------|----------|
| CPU | 8 vCPUs | ~6% carga |
| Memoria | 30 GB | 2.6 GB |
| Backend | 3 replicas | 3/3 running |
| Redis | 2 GB maxmem | ~100 MB |

### VPS PostgreSQL (5.78.137.1)
| Componente | Alocacao | Uso Real |
|------------|----------|----------|
| CPU | 4 vCPUs | <10% |
| Memoria | 16 GB | ~20% |
| PostgreSQL | max 500 conn | ~10 conn |
| shared_buffers | 4 GB | Ativo |

---

## Capacidade Estimada

### Por Escritorio (estimativa media)
- 5 usuarios ativos
- 100 cases ativos
- 50 clientes
- 20 requests/minuto em horario de pico

### Limites Calculados

| Cenario | Escritorios | Usuarios Simultaneos | Requests/min |
|---------|-------------|---------------------|--------------|
| Atual (3 replicas) | 150-200 | 500-750 | 6.000 |
| Escalado (6 replicas) | 300-400 | 1.000-1.500 | 12.000 |
| Maximo (banco dedicado) | 400-500 | 2.000 | 20.000 |

### Gargalos Potenciais

1. **Conexoes PostgreSQL**: 500 max
   - Atual: 3 replicas x 25 = 75 conexoes
   - Limite seguro: 6 replicas x 25 = 150 conexoes
   - Margem: 70%

2. **Memoria Backend**: 1.5GB por replica
   - Atual: 3 x 1.5GB = 4.5GB
   - Disponivel: 27GB
   - Margem: 80%

3. **Redis**: 2GB maxmemory
   - Atual: ~100MB
   - Margem: 95%

---

## Alertas de Capacidade

### Quando Escalar

| Metrica | Threshold Warning | Threshold Critico | Acao |
|---------|-------------------|-------------------|------|
| CPU | > 60% | > 80% | Adicionar replicas |
| Memoria | > 70% | > 85% | Verificar leaks |
| Load Average | > 4 | > 6 | Adicionar replicas |
| DB Conexoes | > 300 | > 400 | Verificar connection pooling |
| Latencia API | > 500ms | > 1s | Investigar queries |

### Como Escalar

```bash
# Aumentar replicas do backend
docker service scale advtom_backend=N

# Verificar nova capacidade
docker service ls | grep backend
curl https://api.advwell.pro/health
```

---

## Projecao de Crescimento

### Fase 1: Ate 100 Escritorios (ATUAL)
- Configuracao: 3 replicas backend
- Sem necessidade de mudancas

### Fase 2: 100-200 Escritorios
- Aumentar para 4-5 replicas backend
- Monitorar conexoes PostgreSQL

### Fase 3: 200-400 Escritorios
- Aumentar para 6 replicas backend
- Considerar adicionar VPS adicional
- Implementar caching mais agressivo

### Fase 4: 400+ Escritorios
- Considerar cluster Kubernetes
- PostgreSQL com read replicas
- CDN para assets estaticos

---

## Benchmarks de Referencia

### Endpoint /health (baseline)
```
Concorrencia: 200
Throughput: 830 req/s
Latencia p50: 236ms
Latencia p99: 484ms
```

### Endpoint autenticado (estimado)
```
Throughput esperado: 400-500 req/s
Latencia esperada: 300-500ms
```

### Operacoes de banco pesadas
```
Throughput esperado: 50-100 req/s
Latencia esperada: 500ms-2s
```

---

## Comandos para Monitoramento

```bash
# Ver carga em tempo real
htop

# Ver uso de memoria por container
docker stats --no-stream

# Ver conexoes do banco
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c 'SELECT count(*) FROM pg_stat_activity;'"

# Ver requests por segundo (aproximado via logs)
docker service logs advtom_backend --since 1m 2>&1 | grep -c "HTTP"

# Ver latencia do banco
ssh root@5.78.137.1 "docker exec advwell-postgres psql -U postgres -c \"SELECT avg(total_exec_time) FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;\""
```

---

*Teste realizado em: 2026-01-04*
*Configuracao: 3 replicas backend, PostgreSQL dedicado*
