# AdvWell - Guia de Instalacao para Revenda

## Requisitos da VPS

| Requisito | Minimo | Recomendado |
|-----------|--------|-------------|
| **RAM** | 4GB | 8GB+ |
| **CPU** | 2 cores | 4 cores |
| **Disco** | 40GB SSD | 80GB+ SSD |
| **SO** | Ubuntu 20.04+ | Ubuntu 22.04 |
| **Docker** | 20.10+ | 24.0+ |

---

## Passo 1: Preparar a VPS

### 1.1 Instalar Docker e Docker Swarm
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | bash

# Iniciar Docker Swarm
docker swarm init

# Criar rede publica (necessaria para Traefik)
docker network create --driver overlay --attachable network_public
```

### 1.2 Instalar Traefik (Load Balancer + SSL)
```bash
# Criar diretorio para Traefik
mkdir -p /opt/traefik

# Criar arquivo de configuracao do Traefik
cat > /opt/traefik/traefik.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:2.11.2
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencryptresolver.acme.email=<<TROCAR_EMAIL_SSL>>"
      - "--certificatesresolvers.letsencryptresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - network_public
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager

networks:
  network_public:
    external: true

volumes:
  traefik_letsencrypt:
EOF

# IMPORTANTE: Substitua <<TROCAR_EMAIL_SSL>> pelo email do cliente
# Depois faça deploy do Traefik:
docker stack deploy -c /opt/traefik/traefik.yml traefik
```

---

## Passo 2: Gerar Credenciais

Execute estes comandos para gerar credenciais seguras:

```bash
echo "============================================"
echo "CREDENCIAIS GERADAS - GUARDE COM SEGURANCA!"
echo "============================================"
echo ""
echo "SENHA_BANCO:"
openssl rand -base64 32
echo ""
echo "JWT_SECRET:"
openssl rand -hex 32
echo ""
echo "ENCRYPTION_KEY:"
openssl rand -hex 32
echo ""
echo "============================================"
```

**Anote todas as credenciais geradas!**

---

## Passo 3: Configurar DNS

Antes de fazer o deploy, configure o DNS do dominio do cliente:

| Tipo | Nome | Valor |
|------|------|-------|
| A | api | IP_DA_VPS |
| A | app | IP_DA_VPS |

Exemplo para dominio `cliente.com.br`:
- `api.cliente.com.br` -> IP da VPS
- `app.cliente.com.br` -> IP da VPS

**Aguarde a propagacao do DNS (pode levar ate 24h, geralmente 5-30 min)**

---

## Passo 4: Build do Frontend (OBRIGATORIO)

O frontend precisa ser reconstruido com a URL do cliente:

```bash
# Clonar repositorio (ou copiar arquivos)
git clone https://github.com/TOMBRITO1979/app.advwell.git
cd app.advwell

# Build do frontend com a nova URL
# Substitua DOMINIO_API pelo dominio real (ex: api.cliente.com.br)
docker build \
  --build-arg VITE_API_URL=https://<<DOMINIO_API>>/api \
  -t advwell-frontend-cliente:v1 \
  frontend/

# Verificar se a imagem foi criada
docker images | grep advwell-frontend-cliente
```

---

## Passo 5: Configurar a Stack

### 5.1 Editar o arquivo advwell_revenda_stack.yml

Substitua TODOS os valores marcados com `<<TROCAR_...>>`:

| Placeholder | Descricao | Exemplo |
|-------------|-----------|---------|
| `<<TROCAR_NOME_BANCO>>` | Nome do banco | `advwell_cliente1` |
| `<<TROCAR_USUARIO_BANCO>>` | Usuario do banco | `postgres` |
| `<<TROCAR_SENHA_BANCO>>` | Senha do banco | (gerada no Passo 2) |
| `<<TROCAR_JWT_SECRET>>` | Chave JWT | (gerada no Passo 2) |
| `<<TROCAR_ENCRYPTION_KEY>>` | Chave criptografia | (gerada no Passo 2) |
| `<<TROCAR_AWS_ACCESS_KEY>>` | AWS Access Key | `AKIA...` |
| `<<TROCAR_AWS_SECRET_KEY>>` | AWS Secret Key | `dUz3...` |
| `<<TROCAR_AWS_REGION>>` | Regiao AWS | `us-east-1` |
| `<<TROCAR_S3_BUCKET>>` | Nome do bucket | `advwell-cliente1` |
| `<<TROCAR_SMTP_HOST>>` | Servidor SMTP | `smtp.gmail.com` |
| `<<TROCAR_SMTP_PORT>>` | Porta SMTP | `587` |
| `<<TROCAR_SMTP_USER>>` | Email SMTP | `app@cliente.com.br` |
| `<<TROCAR_SMTP_PASSWORD>>` | Senha SMTP | (App Password) |
| `<<TROCAR_SMTP_FROM>>` | Email remetente | `noreply@cliente.com.br` |
| `<<TROCAR_DOMINIO_API>>` | Dominio da API | `api.cliente.com.br` |
| `<<TROCAR_DOMINIO_APP>>` | Dominio do App | `app.cliente.com.br` |
| `<<TROCAR_IMAGEM_FRONTEND>>` | Imagem do frontend | `advwell-frontend-cliente:v1` |

### 5.2 Verificar alteracoes

```bash
# Verificar se ainda ha placeholders nao substituidos
grep -n "<<TROCAR" advwell_revenda_stack.yml
# Se retornar algo, ainda falta substituir!
```

---

## Passo 6: Deploy da Stack

```bash
# Fazer deploy
docker stack deploy -c advwell_revenda_stack.yml advwell

# Aguardar servicos iniciarem (30-60 segundos)
sleep 60

# Verificar status dos servicos
docker service ls | grep advwell

# Todos devem estar com REPLICAS corretas (ex: 3/3, 2/2, 1/1)
```

---

## Passo 7: Verificar Instalacao

### 7.1 Verificar Health Check
```bash
curl -s https://api.DOMINIO_CLIENTE/health | jq
```

Resposta esperada:
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "connected"},
    "redis": {"status": "connected"}
  }
}
```

### 7.2 Acessar o Sistema
- Frontend: `https://app.DOMINIO_CLIENTE`
- API: `https://api.DOMINIO_CLIENTE`

### 7.3 Criar Primeiro Usuario
Acesse o frontend e faca o registro da primeira empresa/usuario.

---

## Passo 8: Criar Usuario Super Admin (Opcional)

Se precisar de acesso administrativo total:

```bash
# Acessar container do postgres
docker exec -it $(docker ps -q -f name=advwell_postgres) psql -U postgres -d NOME_BANCO

# No psql, executar:
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'email@doadmin.com';
\q
```

---

## Solucao de Problemas

### Servicos nao iniciam
```bash
# Ver logs do backend
docker service logs advwell_backend -f --tail 100

# Ver logs do postgres
docker service logs advwell_postgres -f --tail 100
```

### Erro de SSL/Certificado
```bash
# Verificar logs do Traefik
docker service logs traefik_traefik -f --tail 100

# Verificar se DNS esta propagado
nslookup api.DOMINIO_CLIENTE
nslookup app.DOMINIO_CLIENTE
```

### Erro de conexao com banco
```bash
# Verificar se postgres esta rodando
docker service ps advwell_postgres

# Testar conexao
docker exec -it $(docker ps -q -f name=advwell_postgres) psql -U postgres -d NOME_BANCO -c "SELECT 1"
```

---

## Comandos Uteis

```bash
# Ver todos os servicos
docker service ls | grep advwell

# Escalar backend (mais replicas)
docker service scale advwell_backend=5

# Reiniciar um servico
docker service update --force advwell_backend

# Ver logs em tempo real
docker service logs advwell_backend -f

# Remover stack (CUIDADO: apaga tudo)
docker stack rm advwell
```

---

## Backup

### Backup do Banco
```bash
docker exec $(docker ps -q -f name=advwell_postgres) pg_dump -U postgres NOME_BANCO > backup_$(date +%Y%m%d).sql
```

### Restore do Banco
```bash
docker exec -i $(docker ps -q -f name=advwell_postgres) psql -U postgres -d NOME_BANCO < backup.sql
```

---

## Suporte

Em caso de problemas, verifique:
1. Logs dos servicos
2. Status do DNS
3. Certificado SSL (Traefik)
4. Credenciais no arquivo de stack

---

**Versao do Guia:** 1.0
**Data:** 2024-11-30
