#!/bin/bash
# AdvWell Production Setup Script
# Configures automated backups, monitoring, and production optimizations

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        AdvWell Production Setup - 100+ Companies         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root${NC}"
    exit 1
fi

# Step 1: Install AWS CLI if not present
echo -e "${YELLOW}[1/7] Checking AWS CLI installation...${NC}"
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    apt-get update -qq
    apt-get install -y awscli
    echo -e "${GREEN}✓ AWS CLI installed${NC}"
else
    echo -e "${GREEN}✓ AWS CLI already installed${NC}"
fi

# Step 2: Configure AWS credentials (if not already configured)
echo -e "${YELLOW}[2/7] Checking AWS credentials...${NC}"
if [ ! -f ~/.aws/credentials ]; then
    echo -e "${YELLOW}AWS credentials not found. Please configure:${NC}"
    echo "Run: aws configure"
    echo "Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
else
    echo -e "${GREEN}✓ AWS credentials configured${NC}"
fi

# Step 3: Setup cron job for automated backups
echo -e "${YELLOW}[3/7] Setting up automated backups...${NC}"

# Remove old cron job if exists
crontab -l 2>/dev/null | grep -v 'backup-to-s3.sh' | crontab - 2>/dev/null || true

# Add new cron job (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/advtom/backup-to-s3.sh >> /var/log/advtom-backup.log 2>&1") | crontab -

echo -e "${GREEN}✓ Backup cron job configured (daily at 2 AM)${NC}"
echo "  Log file: /var/log/advtom-backup.log"

# Step 4: Test backup script
echo -e "${YELLOW}[4/7] Testing backup script...${NC}"
if /root/advtom/backup-to-s3.sh; then
    echo -e "${GREEN}✓ Backup test successful${NC}"
else
    echo -e "${RED}✗ Backup test failed - check AWS credentials and S3 bucket${NC}"
fi

# Step 5: Configure disk space monitoring
echo -e "${YELLOW}[5/7] Setting up disk space monitoring...${NC}"

cat > /root/advtom/monitor-disk.sh << 'EOFSCRIPT'
#!/bin/bash
# Disk space monitoring - alerts when usage > 80%

THRESHOLD=80
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Disk usage is at ${USAGE}% (threshold: ${THRESHOLD}%)"
    echo "Run: docker system prune -a --volumes to clean up"

    # Optional: Send alert (configure webhook URL)
    # curl -X POST "YOUR_WEBHOOK_URL" -d "Disk usage: ${USAGE}%"
fi
EOFSCRIPT

chmod +x /root/advtom/monitor-disk.sh

# Add to cron (check every hour)
(crontab -l 2>/dev/null | grep -v 'monitor-disk.sh'; echo "0 * * * * /root/advtom/monitor-disk.sh >> /var/log/advtom-disk-monitor.log 2>&1") | crontab -

echo -e "${GREEN}✓ Disk monitoring configured (hourly checks)${NC}"

# Step 6: Create health check endpoint monitor
echo -e "${YELLOW}[6/7] Creating health check monitor...${NC}"

cat > /root/advtom/health-check.sh << 'EOFSCRIPT'
#!/bin/bash
# Health check for AdvWell services

API_URL="https://api.advwell.pro/health"
APP_URL="https://app.advwell.pro"

# Check API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" || echo "000")
if [ "$API_STATUS" != "200" ]; then
    echo "ERROR: API health check failed (HTTP $API_STATUS)"
fi

# Check App
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || echo "000")
if [ "$APP_STATUS" != "200" ]; then
    echo "ERROR: App health check failed (HTTP $APP_STATUS)"
fi

# Check Docker services
BACKEND_REPLICAS=$(docker service ls --filter name=advtom_backend --format "{{.Replicas}}")
if [[ ! "$BACKEND_REPLICAS" =~ ^[1-9]/[1-9] ]]; then
    echo "ERROR: Backend service not healthy: $BACKEND_REPLICAS"
fi
EOFSCRIPT

chmod +x /root/advtom/health-check.sh

# Add to cron (check every 5 minutes)
(crontab -l 2>/dev/null | grep -v 'health-check.sh'; echo "*/5 * * * * /root/advtom/health-check.sh >> /var/log/advtom-health.log 2>&1") | crontab -

echo -e "${GREEN}✓ Health monitoring configured (every 5 minutes)${NC}"

# Step 7: Summary and next steps
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Production Setup Complete! ✓                ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Configured Services:${NC}"
echo "  ✓ Automated S3 backups (daily at 2 AM)"
echo "  ✓ Disk space monitoring (hourly)"
echo "  ✓ Health checks (every 5 minutes)"
echo ""
echo -e "${BLUE}Log Files:${NC}"
echo "  • Backups: /var/log/advtom-backup.log"
echo "  • Disk: /var/log/advtom-disk-monitor.log"
echo "  • Health: /var/log/advtom-health.log"
echo ""
echo -e "${BLUE}Cron Jobs:${NC}"
crontab -l | grep advtom || echo "  (none configured)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Deploy production config:"
echo "     ${GREEN}docker stack deploy -c docker-compose.production.yml advtom${NC}"
echo ""
echo "  2. Scale services for 100 companies:"
echo "     ${GREEN}docker service scale advtom_backend=3${NC}"
echo "     ${GREEN}docker service scale advtom_frontend=2${NC}"
echo ""
echo "  3. Monitor services:"
echo "     ${GREEN}docker service ls${NC}"
echo "     ${GREEN}docker service ps advtom_backend${NC}"
echo ""
echo "  4. Set up external monitoring (recommended):"
echo "     • UptimeRobot: https://uptimerobot.com (free)"
echo "     • Sentry: https://sentry.io (error tracking)"
echo ""
echo -e "${GREEN}System is ready for 100+ companies! 🚀${NC}"
