#!/bin/sh
# Docker Entrypoint - Carrega secrets do Docker Secrets para variáveis de ambiente
# Este script permite migração gradual de env vars para Docker Secrets

set -e

# Função para carregar secret do arquivo para variável de ambiente
load_secret() {
    SECRET_NAME="$1"
    ENV_VAR_NAME="$2"
    SECRET_FILE="/run/secrets/${SECRET_NAME}"

    # Se o arquivo de secret existir, carrega-o
    if [ -f "$SECRET_FILE" ]; then
        # Remove newlines e espaços em branco do final
        SECRET_VALUE=$(cat "$SECRET_FILE" | tr -d '\n')
        export "${ENV_VAR_NAME}=${SECRET_VALUE}"
        echo "[entrypoint] Loaded secret: ${SECRET_NAME} -> ${ENV_VAR_NAME}"
    fi
}

echo "[entrypoint] Starting AdvWell Backend..."
echo "[entrypoint] Checking for Docker Secrets..."

# Lista de secrets suportados (mapeamento: nome_do_secret -> nome_da_env_var)
# Os secrets são opcionais - se não existirem, usa a env var normal

load_secret "postgres_password" "POSTGRES_PASSWORD"
load_secret "redis_password" "REDIS_PASSWORD"
load_secret "jwt_secret" "JWT_SECRET"
load_secret "encryption_key" "ENCRYPTION_KEY"
load_secret "aws_secret_access_key" "AWS_SECRET_ACCESS_KEY"
load_secret "smtp_password" "SMTP_PASSWORD"
load_secret "datajud_api_key" "DATAJUD_API_KEY"
load_secret "advapi_api_key" "ADVAPI_API_KEY"
load_secret "advapi_webhook_key" "ADVAPI_WEBHOOK_KEY"
load_secret "stripe_secret_key" "STRIPE_SECRET_KEY"
load_secret "stripe_webhook_secret" "STRIPE_WEBHOOK_SECRET"
load_secret "health_check_key" "HEALTH_CHECK_KEY"

# Reconstrói DATABASE_URL se postgres_password foi carregado do secret
if [ -f "/run/secrets/postgres_password" ] && [ -n "$DATABASE_URL" ]; then
    # Extrai a senha do secret
    PG_PASS=$(cat /run/secrets/postgres_password | tr -d '\n')
    # Substitui a senha na DATABASE_URL
    # Pattern: postgresql://user:password@host:port/db
    NEW_URL=$(echo "$DATABASE_URL" | sed "s|:[^:@]*@|:${PG_PASS}@|")
    export DATABASE_URL="$NEW_URL"
    echo "[entrypoint] Updated DATABASE_URL with secret password"
fi

echo "[entrypoint] Environment configured. Starting application..."

# Executa o comando passado (node, npm, etc.)
exec "$@"
