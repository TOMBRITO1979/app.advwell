#!/bin/bash
# AdvWell Automated Backup Script
# Runs daily at 2 AM via cron
# Backs up PostgreSQL database to S3 with 30-day retention

set -e

# Configuration
BACKUP_DIR="/root/advtom/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="advtom_backup_${DATE}.sql.gz"
S3_BUCKET="${S3_BUCKET_NAME:-advwell-app}"
S3_PREFIX="database-backups"
RETENTION_DAYS=30

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AdvWell Database Backup ===${NC}"
echo "Date: $(date)"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Get PostgreSQL container ID
echo -e "${YELLOW}[1/5] Finding PostgreSQL container...${NC}"
PG_CONTAINER=$(docker ps -q -f name=advtom_postgres)

if [ -z "$PG_CONTAINER" ]; then
    echo -e "${RED}ERROR: PostgreSQL container not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found container: $PG_CONTAINER${NC}"

# Create database backup
echo -e "${YELLOW}[2/5] Creating database dump...${NC}"
docker exec $PG_CONTAINER pg_dump -U postgres advtom | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not created!${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✓ Backup created: $BACKUP_SIZE${NC}"

# Upload to S3
echo -e "${YELLOW}[3/5] Uploading to S3...${NC}"
if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE" \
        --storage-class STANDARD_IA \
        --metadata "backup-date=$(date -Iseconds),database=advtom,retention-days=$RETENTION_DAYS"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE${NC}"
    else
        echo -e "${RED}ERROR: S3 upload failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}ERROR: AWS CLI not installed!${NC}"
    echo "Install with: apt-get install awscli"
    exit 1
fi

# Clean old local backups (keep last 7 days)
echo -e "${YELLOW}[4/5] Cleaning old local backups (>7 days)...${NC}"
find "$BACKUP_DIR" -name "advtom_backup_*.sql.gz" -mtime +7 -delete
echo -e "${GREEN}✓ Local cleanup complete${NC}"

# Clean old S3 backups (keep last 30 days)
echo -e "${YELLOW}[5/5] Cleaning old S3 backups (>$RETENTION_DAYS days)...${NC}"
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)

aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" | while read -r line; do
    # Extract date from filename
    BACKUP_DATE=$(echo "$line" | grep -oP 'advtom_backup_\K[0-9]{8}' || true)

    if [ -n "$BACKUP_DATE" ] && [ "$BACKUP_DATE" -lt "$CUTOFF_DATE" ]; then
        FILE_NAME=$(echo "$line" | awk '{print $4}')
        echo "Deleting old backup: $FILE_NAME"
        aws s3 rm "s3://$S3_BUCKET/$S3_PREFIX/$FILE_NAME"
    fi
done
echo -e "${GREEN}✓ S3 cleanup complete${NC}"

# Summary
echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo "Local: $BACKUP_DIR/$BACKUP_FILE ($BACKUP_SIZE)"
echo "S3: s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE"
echo "Retention: $RETENTION_DAYS days"
echo "Next backup: $(date -d 'tomorrow 02:00' '+%Y-%m-%d %H:%M')"

# Send success notification (optional - requires additional setup)
# curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
#   -H 'Content-Type: application/json' \
#   -d "{\"text\":\"✅ AdvWell backup successful: $BACKUP_FILE ($BACKUP_SIZE)\"}"

exit 0
