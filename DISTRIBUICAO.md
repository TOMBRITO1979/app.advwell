# Guia de Distribuição do AdvTom

Este guia explica como distribuir o sistema AdvTom para outros clientes.

## URLs Atuais (Teste)

- Frontend: https://app.advtom.com
- Backend: https://api.advtom.com

## Passo a Passo para Distribuição

### 1. Obter informações do cliente

Você precisará de:
- **URL do frontend** (ex: app.escritorio.com.br)
- **URL da API** (ex: api.escritorio.com.br)
- **IP do servidor VPS** do cliente
- **Credenciais SSH** do servidor
- **DNS configurado** apontando para o servidor

### 2. Editar docker-compose.yml

```bash
cd /root/advtom
cp docker-compose.yml docker-compose-cliente.yml
vim docker-compose-cliente.yml
```

Altere estas linhas:

```yaml
# Linha 43-44: URLs do backend
- API_URL=https://api.escritorio.com.br
- FRONTEND_URL=https://app.escritorio.com.br

# Linha 60: Host do Traefik para backend
- "traefik.http.routers.advtom-backend.rule=Host(`api.escritorio.com.br`)"

# Linha 69: URL da API para o frontend
- VITE_API_URL=https://api.escritorio.com.br/api

# Linha 78: Host do Traefik para frontend
- "traefik.http.routers.advtom-frontend.rule=Host(`app.escritorio.com.br`)"
```

### 3. Rebuild da imagem do frontend

```bash
cd /root/advtom/frontend

docker build --no-cache \
  --build-arg VITE_API_URL=https://api.escritorio.com.br/api \
  -t tomautomations/advtom-frontend:escritorio .
```

**Dica**: Use uma tag diferente para cada cliente (ex: `:escritorio`, `:cliente1`, etc.)

### 4. Push das imagens

```bash
# Backend (pode usar a mesma imagem)
docker push tomautomations/advtom-backend:latest

# Frontend (com tag específica do cliente)
docker push tomautomations/advtom-frontend:escritorio
```

### 5. Atualizar docker-compose do cliente

No arquivo `docker-compose-cliente.yml`, atualize a imagem do frontend:

```yaml
frontend:
  image: tomautomations/advtom-frontend:escritorio
```

### 6. Criar script de deploy para o cliente

```bash
cp deploy_expect.sh deploy_cliente.sh
vim deploy_cliente.sh
```

Altere estas linhas:

```bash
# Linha 5: IP do servidor do cliente
set host "root@IP_DO_SERVIDOR_CLIENTE"

# Linha 8: Nome do arquivo docker-compose
spawn scp -o StrictHostKeyChecking=no /root/advtom/docker-compose-cliente.yml $host:/root/advtom-stack.yml
```

### 7. Deploy no servidor do cliente

```bash
chmod +x deploy_cliente.sh
./deploy_cliente.sh
```

## Opção Alternativa: Deploy Manual

Se preferir fazer deploy manual:

```bash
# 1. Copiar docker-compose
scp docker-compose-cliente.yml root@IP_CLIENTE:/root/advtom-stack.yml

# 2. Conectar ao servidor
ssh root@IP_CLIENTE

# 3. Criar rede (se não existir)
docker network create --driver overlay network_public

# 4. Deploy
docker stack deploy -c /root/advtom-stack.yml advtom

# 5. Verificar
docker stack ps advtom
```

## Verificar Deploy

```bash
# Conectar ao servidor do cliente
ssh root@IP_CLIENTE

# Ver status
docker stack ps advtom

# Ver logs
docker service logs advtom_backend -f
docker service logs advtom_frontend -f
```

## Checklist de Pré-Deploy

- [ ] DNS configurado apontando para o servidor
- [ ] Traefik rodando no servidor com SSL configurado
- [ ] Rede `network_public` criada
- [ ] Portas 80 e 443 abertas no firewall
- [ ] Docker Swarm inicializado
- [ ] URLs alteradas no docker-compose.yml
- [ ] Frontend rebuilded com nova URL da API
- [ ] Imagens enviadas para Docker Hub

## Pós-Deploy

### 1. Testar acesso

- Acesse: https://app.escritorio.com.br
- Verifique se carrega o frontend
- Teste o registro de conta
- Teste o login

### 2. Verificar backend

- Acesse: https://api.escritorio.com.br/health
- Deve retornar: `{"status":"ok",...}`

### 3. Orientar cliente

Envie para o cliente:
- URL do sistema: https://app.escritorio.com.br
- Instruções de primeiro acesso
- Dados para contato em caso de problemas

## Configurações Específicas do Cliente

### SMTP (Email)

Se o cliente quiser usar seu próprio email:

```yaml
- SMTP_HOST=smtp.dominio.com
- SMTP_PORT=587
- SMTP_USER=sistema@escritorio.com.br
- SMTP_PASSWORD=senha_app
- SMTP_FROM=Sistema AdvTom <sistema@escritorio.com.br>
```

### AWS S3 (Documentos)

Se o cliente quiser seu próprio bucket:

```yaml
- AWS_ACCESS_KEY_ID=key_do_cliente
- AWS_SECRET_ACCESS_KEY=secret_do_cliente
- AWS_REGION=us-east-1
- S3_BUCKET_NAME=bucket_do_cliente
```

### Banco de Dados

Sempre use uma senha forte e única:

```yaml
- POSTGRES_PASSWORD=SenhaForteUnica123!@#
```

Atualize também no `DATABASE_URL`:

```yaml
- DATABASE_URL=postgresql://postgres:SenhaForteUnica123!@#@postgres:5432/advtom
```

## Múltiplos Clientes no Mesmo Servidor

É possível rodar múltiplos clientes no mesmo servidor:

### 1. Use stacks diferentes

```bash
# Cliente 1
docker stack deploy -c cliente1-stack.yml cliente1

# Cliente 2
docker stack deploy -c cliente2-stack.yml cliente2
```

### 2. Use databases diferentes

```yaml
# Cliente 1
- DATABASE_URL=postgresql://postgres:senha@postgres_cliente1:5432/advtom_cliente1

# Cliente 2
- DATABASE_URL=postgresql://postgres:senha@postgres_cliente2:5432/advtom_cliente2
```

### 3. Use nomes de serviço únicos

```yaml
# Cliente 1
services:
  postgres_cliente1:
  backend_cliente1:
  frontend_cliente1:

# Cliente 2
services:
  postgres_cliente2:
  backend_cliente2:
  frontend_cliente2:
```

## Troubleshooting

### SSL não funciona

Verifique se o Traefik está configurado corretamente:

```bash
docker service logs traefik
```

O Traefik precisa ter:
- Acesso à porta 80 e 443
- Resolver DNS configurado
- Email configurado para Let's Encrypt

### Backend não conecta ao PostgreSQL

Verifique se os serviços estão na mesma rede:

```bash
docker network inspect network_public
```

### Erro ao fazer rebuild do frontend

Limpe o cache do Docker:

```bash
docker builder prune -a
```

## Suporte

Para suporte técnico durante o deploy, consulte os logs:

```bash
# Backend
docker service logs --tail 100 advtom_backend

# Frontend
docker service logs --tail 100 advtom_frontend

# PostgreSQL
docker service logs --tail 100 advtom_postgres
```

## Contato

Para questões sobre distribuição, consulte:
- README.md - Documentação técnica
- ACESSO.md - Guia de uso do sistema

---

**Boa distribuição! 🚀**
