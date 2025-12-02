#!/bin/bash
# ============================================================================
# ADVWELL - SCRIPT DE INSTALACAO PARA REVENDA
# ============================================================================
#
# Este script automatiza a configuracao da stack AdvWell para um novo cliente.
#
# Uso: ./advwell_revenda_codigo.sh
#
# ============================================================================

set -e

echo "============================================"
echo "  ADVWELL - CONFIGURACAO PARA REVENDA"
echo "============================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funcao para gerar senhas seguras
generate_password() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

generate_hex() {
    openssl rand -hex 32
}

# Coletar informacoes do cliente
echo -e "${YELLOW}=== INFORMACOES DO CLIENTE ===${NC}"
echo ""

read -p "Nome do cliente (sem espacos, ex: escritorio_silva): " CLIENTE_NOME
read -p "Dominio da API (ex: api.cliente.com.br): " DOMINIO_API
read -p "Dominio do App (ex: app.cliente.com.br): " DOMINIO_APP
read -p "Email para SSL/Let's Encrypt: " EMAIL_SSL

echo ""
echo -e "${YELLOW}=== CONFIGURACAO DE EMAIL (SMTP) ===${NC}"
read -p "Servidor SMTP (ex: smtp.gmail.com): " SMTP_HOST
read -p "Porta SMTP (ex: 587): " SMTP_PORT
read -p "Usuario SMTP (email): " SMTP_USER
read -p "Senha SMTP (App Password): " SMTP_PASSWORD
read -p "Email remetente (ex: noreply@cliente.com.br): " SMTP_FROM

echo ""
echo -e "${YELLOW}=== CONFIGURACAO AWS S3 ===${NC}"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY
read -p "AWS Secret Access Key: " AWS_SECRET_KEY
read -p "AWS Region (ex: us-east-1): " AWS_REGION
read -p "Nome do Bucket S3: " S3_BUCKET

# Gerar credenciais automaticamente
echo ""
echo -e "${GREEN}=== GERANDO CREDENCIAIS SEGURAS ===${NC}"

SENHA_BANCO=$(generate_password)
JWT_SECRET=$(generate_hex)
ENCRYPTION_KEY=$(generate_hex)
NOME_BANCO="advwell_${CLIENTE_NOME}"

echo "Credenciais geradas com sucesso!"

# Criar diretorio do cliente
CLIENTE_DIR="/opt/advwell_${CLIENTE_NOME}"
mkdir -p $CLIENTE_DIR

# Criar arquivo .env
echo ""
echo -e "${GREEN}=== CRIANDO ARQUIVO .ENV ===${NC}"

cat > $CLIENTE_DIR/.env << EOF
# AdvWell - Configuracao do Cliente: $CLIENTE_NOME
# Gerado em: $(date)

# PostgreSQL
POSTGRES_DB=$NOME_BANCO
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$SENHA_BANCO

# JWT
JWT_SECRET=$JWT_SECRET

# Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY

# AWS S3
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_KEY
AWS_REGION=$AWS_REGION
S3_BUCKET_NAME=$S3_BUCKET

# SMTP
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$SMTP_FROM

# URLs
API_URL=https://$DOMINIO_API
FRONTEND_URL=https://$DOMINIO_APP
VITE_API_URL=https://$DOMINIO_API/api

# DataJud (chave publica)
DATAJUD_API_KEY=cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==
EOF

echo "Arquivo .env criado em: $CLIENTE_DIR/.env"

# Criar docker-compose personalizado
echo ""
echo -e "${GREEN}=== CRIANDO DOCKER-COMPOSE ===${NC}"

cat > $CLIENTE_DIR/docker-compose.yml << EOF
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru --tcp-keepalive 300
    volumes:
      - redis_data:/data
    networks:
      - network_public
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=\${POSTGRES_DB}
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    command: >
      postgres
      -c max_connections=500
      -c shared_buffers=2GB
      -c effective_cache_size=6GB
      -c work_mem=16MB
      -c maintenance_work_mem=256MB
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c wal_buffers=16MB
      -c min_wal_size=1GB
      -c max_wal_size=2GB
      -c max_worker_processes=4
      -c max_parallel_workers_per_gather=2
      -c max_parallel_workers=4
    networks:
      - network_public
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '2'
          memory: 3G
      restart_policy:
        condition: on-failure
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: tomautomations/advwell-backend:v101-nationality
    environment:
      - DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB}?connection_limit=10&pool_timeout=10
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=\${JWT_SECRET}
      - ENCRYPTION_KEY=\${ENCRYPTION_KEY}
      - AWS_ACCESS_KEY_ID=\${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=\${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=\${AWS_REGION}
      - S3_BUCKET_NAME=\${S3_BUCKET_NAME}
      - SMTP_HOST=\${SMTP_HOST}
      - SMTP_PORT=\${SMTP_PORT}
      - SMTP_USER=\${SMTP_USER}
      - SMTP_PASSWORD=\${SMTP_PASSWORD}
      - SMTP_FROM=\${SMTP_FROM}
      - API_URL=\${API_URL}
      - FRONTEND_URL=\${FRONTEND_URL}
      - DATAJUD_API_KEY=\${DATAJUD_API_KEY}
      - PORT=3000
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=1024
    networks:
      - network_public
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      resources:
        limits:
          cpus: '1'
          memory: 1G
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-backend.rule=Host(\`$DOMINIO_API\`)"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-backend.entrypoints=websecure"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-backend.tls=true"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-backend.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.advwell-${CLIENTE_NOME}-backend.loadbalancer.server.port=3000"
        - "traefik.http.services.advwell-${CLIENTE_NOME}-backend.loadbalancer.healthcheck.path=/health"
        - "traefik.http.services.advwell-${CLIENTE_NOME}-backend.loadbalancer.healthcheck.interval=10s"
        - "traefik.docker.network=network_public"

  frontend:
    image: advwell-frontend-${CLIENTE_NOME}:v1
    environment:
      - VITE_API_URL=\${VITE_API_URL}
    networks:
      - network_public
    depends_on:
      - backend
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-frontend.rule=Host(\`$DOMINIO_APP\`)"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-frontend.entrypoints=websecure"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-frontend.tls=true"
        - "traefik.http.routers.advwell-${CLIENTE_NOME}-frontend.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.advwell-${CLIENTE_NOME}-frontend.loadbalancer.server.port=80"
        - "traefik.docker.network=network_public"

networks:
  network_public:
    external: true

volumes:
  postgres_data:
  redis_data:
EOF

echo "Docker-compose criado em: $CLIENTE_DIR/docker-compose.yml"

# Criar script de deploy
echo ""
echo -e "${GREEN}=== CRIANDO SCRIPT DE DEPLOY ===${NC}"

cat > $CLIENTE_DIR/deploy.sh << 'DEPLOY_EOF'
#!/bin/bash
echo "Carregando variaveis de ambiente..."
set -a
source .env
set +a

echo "Fazendo deploy da stack..."
docker stack deploy -c docker-compose.yml advwell_CLIENTE_NOME_PLACEHOLDER

echo "Aguardando servicos..."
sleep 30

echo "Status dos servicos:"
docker service ls | grep advwell_CLIENTE_NOME_PLACEHOLDER
DEPLOY_EOF

sed -i "s/CLIENTE_NOME_PLACEHOLDER/$CLIENTE_NOME/g" $CLIENTE_DIR/deploy.sh
chmod +x $CLIENTE_DIR/deploy.sh

echo "Script de deploy criado em: $CLIENTE_DIR/deploy.sh"

# Resumo final
echo ""
echo "============================================"
echo -e "${GREEN}  CONFIGURACAO CONCLUIDA!${NC}"
echo "============================================"
echo ""
echo "Arquivos criados em: $CLIENTE_DIR/"
echo "  - .env (credenciais)"
echo "  - docker-compose.yml (stack)"
echo "  - deploy.sh (script de deploy)"
echo ""
echo -e "${YELLOW}PROXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure o DNS:"
echo "   - $DOMINIO_API -> IP desta VPS"
echo "   - $DOMINIO_APP -> IP desta VPS"
echo ""
echo "2. Faca o build do frontend:"
echo "   cd /caminho/para/app.advwell"
echo "   docker build --build-arg VITE_API_URL=https://$DOMINIO_API/api -t advwell-frontend-$CLIENTE_NOME:v1 frontend/"
echo ""
echo "3. Faca o deploy:"
echo "   cd $CLIENTE_DIR"
echo "   ./deploy.sh"
echo ""
echo "4. Verifique o health check:"
echo "   curl https://$DOMINIO_API/health"
echo ""
echo "============================================"
echo -e "${RED}CREDENCIAIS (GUARDE COM SEGURANCA):${NC}"
echo "============================================"
echo "SENHA_BANCO: $SENHA_BANCO"
echo "JWT_SECRET: $JWT_SECRET"
echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo "============================================"
