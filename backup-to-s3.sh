#!/bin/bash
# ============================================
# AdvWell - Backup para S3
# ============================================
# Este script faz backup do banco de dados PostgreSQL
# e envia para um bucket S3.
#
# Requisitos:
# - AWS CLI instalado (apt install awscli)
# - Credenciais AWS configuradas
#
# Uso:
#   ./backup-to-s3.sh
#
# Variáveis de ambiente necessárias:
#   AWS_ACCESS_KEY_ID     - Chave de acesso AWS
#   AWS_SECRET_ACCESS_KEY - Chave secreta AWS
#   AWS_REGION            - Região AWS (padrão: us-east-1)
#   S3_BACKUP_BUCKET      - Nome do bucket para backups
# ============================================

set -e

# Configuração
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/advwell-backups"
DB_BACKUP_FILE="advwell_db_${TIMESTAMP}.sql.gz"
FULL_BACKUP_FILE="advwell_full_${TIMESTAMP}.tar.gz"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AdvWell - Backup para S3${NC}"
echo -e "${GREEN}  Data: $(date)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verificar variáveis de ambiente
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}ERRO: Credenciais AWS não configuradas.${NC}"
    echo ""
    echo "Configure as variáveis de ambiente:"
    echo "  export AWS_ACCESS_KEY_ID='sua-access-key'"
    echo "  export AWS_SECRET_ACCESS_KEY='sua-secret-key'"
    echo "  export AWS_REGION='us-east-1'"
    echo "  export S3_BACKUP_BUCKET='seu-bucket-de-backup'"
    exit 1
fi

if [ -z "$S3_BACKUP_BUCKET" ]; then
    echo -e "${YELLOW}AVISO: S3_BACKUP_BUCKET não definido. Usando 'advwell-backups'${NC}"
    S3_BACKUP_BUCKET="advwell-backups"
fi

AWS_REGION=${AWS_REGION:-us-east-1}

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}[1/4] Fazendo backup do banco de dados...${NC}"
POSTGRES_CONTAINER=$(docker ps -q -f name=advtom_postgres)
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}ERRO: Container PostgreSQL não encontrado.${NC}"
    exit 1
fi

docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres -d advtom | gzip > "$BACKUP_DIR/$DB_BACKUP_FILE"
DB_SIZE=$(du -h "$BACKUP_DIR/$DB_BACKUP_FILE" | cut -f1)
echo -e "${GREEN}   ✓ Backup do banco: $DB_BACKUP_FILE ($DB_SIZE)${NC}"

echo -e "${YELLOW}[2/4] Criando backup completo (código + configs)...${NC}"
cd /root/advtom
tar -czf "$BACKUP_DIR/$FULL_BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='dist' \
    docker-compose.yml \
    .env \
    backend/prisma \
    backend/src \
    frontend/src \
    2>/dev/null || true

FULL_SIZE=$(du -h "$BACKUP_DIR/$FULL_BACKUP_FILE" | cut -f1)
echo -e "${GREEN}   ✓ Backup completo: $FULL_BACKUP_FILE ($FULL_SIZE)${NC}"

echo -e "${YELLOW}[3/4] Enviando para S3...${NC}"

# Configurar AWS CLI
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=$AWS_REGION

# Upload do backup do banco
aws s3 cp "$BACKUP_DIR/$DB_BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/database/$DB_BACKUP_FILE" --quiet
echo -e "${GREEN}   ✓ Banco enviado para s3://$S3_BACKUP_BUCKET/database/$DB_BACKUP_FILE${NC}"

# Upload do backup completo
aws s3 cp "$BACKUP_DIR/$FULL_BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/full/$FULL_BACKUP_FILE" --quiet
echo -e "${GREEN}   ✓ Backup completo enviado para s3://$S3_BACKUP_BUCKET/full/$FULL_BACKUP_FILE${NC}"

echo -e "${YELLOW}[4/4] Limpando arquivos temporários...${NC}"
rm -rf "$BACKUP_DIR"
echo -e "${GREEN}   ✓ Arquivos temporários removidos${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Backup concluído com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Arquivos no S3:"
echo "  - s3://$S3_BACKUP_BUCKET/database/$DB_BACKUP_FILE"
echo "  - s3://$S3_BACKUP_BUCKET/full/$FULL_BACKUP_FILE"
echo ""
echo "Para restaurar o banco de dados:"
echo "  aws s3 cp s3://$S3_BACKUP_BUCKET/database/$DB_BACKUP_FILE - | gunzip | docker exec -i \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom"
