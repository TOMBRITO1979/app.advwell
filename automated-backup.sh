#!/bin/bash
# AdvWell Automated Database Backup Script
# Executa backup diário às 2 AM via cron
# Mantém últimos 7 backups locais + upload para S3

set -e

# Carregar variáveis de ambiente
if [ -f /root/advtom/.env ]; then
    export $(grep -v '^#' /root/advtom/.env | xargs)
fi

# Configuração
BACKUP_DIR="/root/advtom/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="advtom_db_backup_${DATE}.sql.gz"
LOG_FILE="/root/advtom/backups/backup.log"
S3_BUCKET="${S3_BUCKET_NAME:-advwell-app}"
S3_PATH="database-backups"

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== AdvWell Database Backup Iniciado ==="
log "Arquivo: $BACKUP_FILE"

# Verificar se PostgreSQL está rodando
PG_CONTAINER=$(docker ps -q -f name=advtom_postgres)

if [ -z "$PG_CONTAINER" ]; then
    log "ERRO: Container PostgreSQL não encontrado!"
    log "Verifique: docker service ls | grep postgres"
    exit 1
fi

log "✓ Container PostgreSQL encontrado: $PG_CONTAINER"

# Criar backup do banco de dados
log "Criando dump do banco de dados..."
docker exec $PG_CONTAINER pg_dump -U postgres advtom | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    log "ERRO: Backup não foi criado!"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
log "✓ Backup criado com sucesso: $BACKUP_SIZE"

# Verificar integridade do backup
log "Verificando integridade do backup..."
if gunzip -t "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null; then
    log "✓ Backup íntegro e válido"
else
    log "⚠ AVISO: Backup pode estar corrompido!"
    exit 1
fi

# Upload para S3 se credenciais estiverem configuradas
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    log "Enviando backup para S3..."

    # Verificar se AWS CLI está instalado
    if ! command -v aws &> /dev/null; then
        log "Instalando AWS CLI..."
        apt-get update -qq && apt-get install -qq -y awscli
    fi

    # Configurar AWS CLI
    export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"

    # Upload para S3
    if aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PATH/$BACKUP_FILE" --quiet; then
        log "✓ Backup enviado para S3: s3://$S3_BUCKET/$S3_PATH/$BACKUP_FILE"

        # Limpar backups antigos no S3 (manter últimos 30 dias)
        log "Limpando backups antigos no S3 (>30 dias)..."
        CUTOFF_DATE=$(date -d '30 days ago' +%Y-%m-%d)
        aws s3 ls "s3://$S3_BUCKET/$S3_PATH/" | while read line; do
            FILE_DATE=$(echo $line | awk '{print $1}')
            FILE_NAME=$(echo $line | awk '{print $4}')
            if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]] && [[ -n "$FILE_NAME" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$S3_PATH/$FILE_NAME" --quiet
                log "  - Removido: $FILE_NAME"
            fi
        done
    else
        log "⚠ AVISO: Falha ao enviar backup para S3"
    fi
else
    log "⚠ Credenciais AWS não configuradas - backup apenas local"
fi

# Limpar backups locais antigos (manter últimos 7 dias)
log "Limpando backups locais antigos (>7 dias)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "advtom_db_backup_*.sql.gz" -mtime +7 -delete -print | wc -l)
log "✓ $DELETED_COUNT backups locais antigos removidos"

# Estatísticas
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/advtom_db_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}' || echo "0")

log "=== Backup Concluído ==="
log "Local: $BACKUP_DIR/$BACKUP_FILE"
log "Tamanho: $BACKUP_SIZE"
log "Total de backups locais: $TOTAL_BACKUPS"
log "Espaço local usado: $TOTAL_SIZE"
log "Próximo backup: $(date -d 'tomorrow 02:00' '+%Y-%m-%d %H:%M')"
log ""

log "=== Sucesso Total ==="
exit 0
