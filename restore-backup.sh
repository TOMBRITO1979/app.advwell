#!/bin/bash
# AdvWell Database Restore Script
# Restaura backup do banco de dados PostgreSQL

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== AdvWell Database Restore ===${NC}"
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Backups disponíveis:${NC}"
    ls -lht /root/advtom/backups/advtom_db_backup_*.sql.gz | head -10
    echo ""
    echo -e "${RED}Uso: $0 <arquivo_backup.sql.gz>${NC}"
    echo "Exemplo: $0 /root/advtom/backups/advtom_db_backup_20251124_130957.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERRO: Arquivo não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Arquivo de backup: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)${NC}"
echo ""

# Confirm action
echo -e "${RED}⚠️  ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados do banco!${NC}"
echo -n "Digite 'CONFIRMO' para continuar: "
read CONFIRM

if [ "$CONFIRM" != "CONFIRMO" ]; then
    echo -e "${YELLOW}Operação cancelada.${NC}"
    exit 0
fi

# Find PostgreSQL container
echo ""
echo -e "${YELLOW}[1/5] Localizando container PostgreSQL...${NC}"
PG_CONTAINER=$(docker ps -q -f name=advtom_postgres)

if [ -z "$PG_CONTAINER" ]; then
    echo -e "${RED}ERRO: Container PostgreSQL não encontrado!${NC}"
    echo "Execute: docker service ls | grep postgres"
    exit 1
fi
echo -e "${GREEN}✓ Container encontrado: $PG_CONTAINER${NC}"

# Create backup of current database before restore
echo -e "${YELLOW}[2/5] Criando backup de segurança do banco atual...${NC}"
SAFETY_BACKUP="/root/advtom/backups/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec $PG_CONTAINER pg_dump -U postgres advtom | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✓ Backup de segurança criado: $SAFETY_BACKUP${NC}"

# Drop existing connections
echo -e "${YELLOW}[3/5] Encerrando conexões ativas...${NC}"
docker exec $PG_CONTAINER psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'advtom' AND pid <> pg_backend_pid();" 2>/dev/null || true
echo -e "${GREEN}✓ Conexões encerradas${NC}"

# Drop and recreate database
echo -e "${YELLOW}[4/5] Recriando banco de dados...${NC}"
docker exec $PG_CONTAINER psql -U postgres -c "DROP DATABASE IF EXISTS advtom;"
docker exec $PG_CONTAINER psql -U postgres -c "CREATE DATABASE advtom;"
echo -e "${GREEN}✓ Banco de dados recriado${NC}"

# Restore backup
echo -e "${YELLOW}[5/5] Restaurando backup...${NC}"
gunzip -c "$BACKUP_FILE" | docker exec -i $PG_CONTAINER psql -U postgres -d advtom

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup restaurado com sucesso!${NC}"
else
    echo -e "${RED}ERRO: Falha ao restaurar backup!${NC}"
    echo -e "${YELLOW}Restaurando backup de segurança...${NC}"
    gunzip -c "$SAFETY_BACKUP" | docker exec -i $PG_CONTAINER psql -U postgres -d advtom
    exit 1
fi

# Verify restoration
echo ""
echo -e "${YELLOW}Verificando restauração...${NC}"
TABLES=$(docker exec $PG_CONTAINER psql -U postgres -d advtom -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
USERS=$(docker exec $PG_CONTAINER psql -U postgres -d advtom -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

echo -e "${GREEN}✓ Tabelas no banco: $(echo $TABLES | xargs)${NC}"
echo -e "${GREEN}✓ Usuários cadastrados: $(echo $USERS | xargs)${NC}"

echo ""
echo -e "${GREEN}=== Restauração Concluída ===${NC}"
echo -e "${YELLOW}Backup de segurança mantido em: $SAFETY_BACKUP${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Testar o sistema: curl -k https://api.advwell.pro/health"
echo "2. Verificar login no frontend"
echo "3. Se tudo estiver OK, remover backup de segurança:"
echo "   rm $SAFETY_BACKUP"

exit 0
