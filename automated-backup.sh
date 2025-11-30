#!/bin/bash
# AdvWell Automated Database Backup Script
# Executa backup diário às 2 AM via cron
# Mantém últimos 7 backups locais

set -e

# Configuração
BACKUP_DIR="/root/advtom/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="advtom_db_backup_${DATE}.sql.gz"
LOG_FILE="/root/advtom/backups/backup.log"

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

# Limpar backups antigos (manter últimos 7 dias)
log "Limpando backups antigos (>7 dias)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "advtom_db_backup_*.sql.gz" -mtime +7 -delete -print | wc -l)
log "✓ $DELETED_COUNT backups antigos removidos"

# Estatísticas
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/advtom_db_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')

log "=== Backup Concluído ==="
log "Local: $BACKUP_DIR/$BACKUP_FILE"
log "Tamanho: $BACKUP_SIZE"
log "Total de backups mantidos: $TOTAL_BACKUPS"
log "Espaço total usado: $TOTAL_SIZE"
log "Próximo backup: $(date -d 'tomorrow 02:00' '+%Y-%m-%d %H:%M')"
log ""

# Verificar integridade do backup
log "Verificando integridade do backup..."
if gunzip -t "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null; then
    log "✓ Backup íntegro e válido"
else
    log "⚠ AVISO: Backup pode estar corrompido!"
    exit 1
fi

log "=== Sucesso Total ==="
exit 0
