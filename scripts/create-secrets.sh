#!/bin/bash
# Script para criar Docker Secrets a partir do .env
# Uso: ./scripts/create-secrets.sh
# Documentação: docs/DOCKER_SECRETS.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  AdvWell - Docker Secrets Creator"
echo "========================================"
echo ""

# Verifica se está em um Swarm
if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
    echo -e "${RED}ERRO: Docker Swarm não está ativo.${NC}"
    echo "Execute: docker swarm init"
    exit 1
fi

# Verifica se o .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERRO: Arquivo .env não encontrado em $ENV_FILE${NC}"
    exit 1
fi

# Carrega variáveis do .env
source "$ENV_FILE"

# Função para criar secret de forma segura
create_secret() {
    SECRET_NAME="$1"
    SECRET_VALUE="$2"

    if [ -z "$SECRET_VALUE" ]; then
        echo -e "${YELLOW}[SKIP] $SECRET_NAME - valor vazio${NC}"
        return
    fi

    # Verifica se o secret já existe
    if docker secret inspect "$SECRET_NAME" &>/dev/null; then
        echo -e "${YELLOW}[EXISTE] $SECRET_NAME - já criado${NC}"
    else
        echo -n "$SECRET_VALUE" | docker secret create "$SECRET_NAME" - >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}[CRIADO] $SECRET_NAME${NC}"
        else
            echo -e "${RED}[ERRO] $SECRET_NAME - falha ao criar${NC}"
        fi
    fi
}

echo "Criando secrets a partir de .env..."
echo ""

# Cria cada secret
create_secret "postgres_password" "$POSTGRES_PASSWORD"
create_secret "redis_password" "$REDIS_PASSWORD"
create_secret "jwt_secret" "$JWT_SECRET"
create_secret "encryption_key" "$ENCRYPTION_KEY"
create_secret "aws_secret_access_key" "$AWS_SECRET_ACCESS_KEY"
create_secret "smtp_password" "$SMTP_PASSWORD"
create_secret "datajud_api_key" "$DATAJUD_API_KEY"
create_secret "advapi_api_key" "$ADVAPI_API_KEY"
create_secret "advapi_webhook_key" "$ADVAPI_WEBHOOK_KEY"
create_secret "stripe_secret_key" "$STRIPE_SECRET_KEY"
create_secret "stripe_webhook_secret" "$STRIPE_WEBHOOK_SECRET"
create_secret "health_check_key" "$HEALTH_CHECK_KEY"

echo ""
echo "========================================"
echo "  Secrets criados!"
echo "========================================"
echo ""
echo "Para listar todos os secrets:"
echo "  docker secret ls"
echo ""
echo "Para usar os secrets, adicione ao docker-compose.yml:"
echo "  services:"
echo "    backend:"
echo "      secrets:"
echo "        - postgres_password"
echo "        - redis_password"
echo "        - ..."
echo ""
echo "E então redesploy: ./deploy.sh"
