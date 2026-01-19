# AdvWell - Checklist de Deploy

## Pre-Deploy

### 1. Verificacoes Obrigatorias

- [ ] **Backup recente existe** (menos de 24h)
  ```bash
  aws s3 ls s3://advwell-app/backups/postgresql/ | tail -1
  ```

- [ ] **Testes passando** (se houver mudancas de codigo)
  ```bash
  cd backend && npm test
  ```

- [ ] **Health check atual OK**
  ```bash
  curl -s https://api.advwell.pro/health | jq
  ```

- [ ] **Servicos estaveis** (sem restarts recentes)
  ```bash
  docker service ls
  docker service ps advtom_backend --format "{{.CurrentState}}" | head -5
  ```

### 2. Verificar Mudancas

- [ ] **Revisar alteracoes no docker-compose.yml**
  ```bash
  git diff docker-compose.yml
  ```

- [ ] **Revisar variaveis de ambiente**
  ```bash
  git diff .env 2>/dev/null || echo "Sem mudancas no .env"
  ```

- [ ] **Verificar migrations pendentes** (se aplicavel)
  ```bash
  cd backend && npx prisma migrate status
  ```

---

## Durante o Deploy

### 3. Executar Deploy

```bash
# 1. Carregar variaveis e deploy
./deploy.sh

# 2. Acompanhar rollout
watch -n 2 docker service ls
```

### 4. Verificar Rollout

- [ ] **Todas as replicas rodando**
  ```bash
  docker service ls | grep backend
  # Esperado: 3/3 (ou o numero configurado)
  ```

- [ ] **Sem erros nos logs**
  ```bash
  docker service logs advtom_backend --tail 50 2>&1 | grep -i error
  ```

- [ ] **Health check respondendo**
  ```bash
  curl -s https://api.advwell.pro/health
  ```

---

## Pos-Deploy

### 5. Validacao Funcional

- [ ] **Login funcionando**
  - Acessar https://app.advwell.pro
  - Fazer login com usuario de teste

- [ ] **API respondendo corretamente**
  ```bash
  # Testar endpoint autenticado (se tiver token)
  curl -s -H "Authorization: Bearer $TOKEN" https://api.advwell.pro/api/users/me
  ```

- [ ] **Verificar metricas**
  - Acessar https://grafana.advwell.pro
  - Verificar dashboard "AdvWell Overview"

### 6. Monitorar por 15 minutos

- [ ] **Sem alertas disparados**
  ```bash
  curl -s http://localhost:9093/api/v1/alerts | jq '.data | length'
  # Esperado: 0
  ```

- [ ] **Latencia normal**
  ```bash
  for i in {1..5}; do
    time curl -s https://api.advwell.pro/health > /dev/null
    sleep 2
  done
  ```

- [ ] **Sem erros 5xx nos logs**
  ```bash
  docker service logs advtom_backend --since 15m 2>&1 | grep -c "5[0-9][0-9]"
  # Esperado: 0 ou muito poucos
  ```

---

## Rollback (se necessario)

### Se houver problemas:

```bash
# 1. Reverter para imagem anterior
docker service update --rollback advtom_backend

# 2. Verificar se voltou ao normal
docker service ps advtom_backend
curl https://api.advwell.pro/health

# 3. Se ainda com problemas, escalar para 0 temporariamente
docker service scale advtom_backend=0

# 4. Investigar nos logs
docker service logs advtom_backend --tail 200 > /tmp/deploy_error_$(date +%Y%m%d_%H%M%S).log

# 5. Corrigir o problema antes de tentar novamente
```

---

## Deploy de Nova Versao (Imagem Docker)

### Build e Push

```bash
# 1. No ambiente de desenvolvimento
cd backend
npm run build
docker build -t tomautomations/advtom-backend:vX.Y.Z .
docker push tomautomations/advtom-backend:vX.Y.Z

cd ../frontend
npm run build
docker build -t tomautomations/advtom-frontend:vX.Y.Z .
docker push tomautomations/advtom-frontend:vX.Y.Z
```

### Atualizar versao no servidor

```bash
# 1. Editar docker-compose.yml
vi docker-compose.yml
# Alterar: image: tomautomations/advtom-backend:vX.Y.Z
# Alterar: image: tomautomations/advtom-frontend:vX.Y.Z

# 2. Deploy
./deploy.sh

# 3. Verificar que a nova versao esta rodando
docker service inspect advtom_backend --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'
```

---

## Deploy com Migration de Banco

### CUIDADO: Migrations podem ter downtime

```bash
# 1. Fazer backup ANTES
ssh root@5.78.137.1 "/root/advwell-db/scripts/backup.sh"

# 2. Escalar backend para 1 replica (evitar conflitos)
docker service scale advtom_backend=1

# 3. Executar migration
docker exec $(docker ps -q -f name=advtom_backend | head -1) \
  npx prisma migrate deploy

# 4. Verificar migration
docker exec $(docker ps -q -f name=advtom_backend | head -1) \
  npx prisma migrate status

# 5. Escalar backend de volta
docker service scale advtom_backend=3

# 6. Testar
curl https://api.advwell.pro/health
```

---

## Checklist Resumido (Copiar e Colar)

```
PRE-DEPLOY:
[ ] Backup recente (< 24h)
[ ] Health check OK
[ ] Servicos estaveis

DEPLOY:
[ ] ./deploy.sh executado
[ ] Replicas 3/3
[ ] Logs sem erros

POS-DEPLOY:
[ ] Login funciona
[ ] API responde
[ ] Grafana OK
[ ] 15min sem alertas
```

---

*Ultima atualizacao: 2026-01-19*
