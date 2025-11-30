#!/bin/bash
# AdvWell Automated Backup Script
# Run daily via cron: 0 3 * * * /root/advtom/backup-cron.sh >> /var/log/advwell-backup.log 2>&1

set -e

# Configuration
BACKUP_DIR="/root/advtom/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="advwell_backup_${DATE}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

echo "=========================================="
echo "AdvWell Backup Started: $(date)"
echo "=========================================="

# 1. Database backup
echo "[1/4] Backing up PostgreSQL database..."
POSTGRES_CONTAINER=$(docker ps -q -f name=advtom_postgres)
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "ERROR: PostgreSQL container not found!"
    exit 1
fi

docker exec "$POSTGRES_CONTAINER" pg_dump -U postgres advtom > "${BACKUP_PATH}/database.sql"
gzip "${BACKUP_PATH}/database.sql"
echo "Database backup completed: database.sql.gz"

# 2. Redis backup (if using persistence)
echo "[2/4] Backing up Redis data..."
REDIS_CONTAINER=$(docker ps -q -f name=advtom_redis)
if [ -n "$REDIS_CONTAINER" ]; then
    # Trigger Redis save
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE || true
    sleep 2
    # Copy RDB file if exists
    docker cp "$REDIS_CONTAINER":/data/dump.rdb "${BACKUP_PATH}/redis.rdb" 2>/dev/null || echo "Redis RDB not found (using AOF only)"
fi
echo "Redis backup completed"

# 3. Configuration backup
echo "[3/4] Backing up configuration files..."
cp /root/advtom/docker-compose.yml "${BACKUP_PATH}/"
cp /root/advtom/.env "${BACKUP_PATH}/.env.backup" 2>/dev/null || echo "No .env file found"
echo "Configuration backup completed"

# 4. Create compressed archive
echo "[4/4] Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_PATH}"
echo "Archive created: ${BACKUP_NAME}.tar.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Cleanup old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "advwell_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(ls -1 "${BACKUP_DIR}"/advwell_backup_*.tar.gz 2>/dev/null | wc -l)
echo "Remaining backups: ${REMAINING}"

# Optional: Upload to S3 (uncomment and configure)
# echo "Uploading to S3..."
# aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://your-bucket/backups/${BACKUP_NAME}.tar.gz"

echo "=========================================="
echo "AdvWell Backup Completed: $(date)"
echo "Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "=========================================="
