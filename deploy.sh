#!/bin/bash
# AdvWell Deployment Script
# Automatically exports environment variables and deploys the stack

set -e  # Exit on error

echo "🚀 Starting AdvWell deployment..."

# Change to project directory
cd /root/advwell

# Export environment variables from .env file
echo "📦 Loading environment variables..."
set -a
source .env
set +a

# Set default values for optional variables (envsubst doesn't support ${VAR:-default} syntax)
export TZ="${TZ:-America/Sao_Paulo}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export S3_BUCKET_NAME="${S3_BUCKET_NAME:-advwell-app}"
export SMTP_PORT="${SMTP_PORT:-587}"
export PORTAL_URL="${PORTAL_URL:-https://cliente.advwell.pro}"

# Deploy the stack
echo "🔧 Deploying Docker stack..."
# Use envsubst to interpolate env vars (preserves YAML formatting unlike docker compose config)
# Keep resolved file in project directory so relative paths work correctly
envsubst < docker-compose.yml > docker-compose-resolved.yml
docker stack deploy -c docker-compose-resolved.yml advtom
rm -f docker-compose-resolved.yml

echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker service ls | grep advtom

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 To check logs:"
echo "   docker service logs advtom_backend -f"
echo "   docker service logs advtom_frontend -f"
echo ""
echo "🌐 URLs:"
echo "   Frontend: https://app.advwell.pro"
echo "   Portal do Cliente: https://cliente.advwell.pro"
echo "   Backend API: https://api.advwell.pro"
echo "   Health Check: https://api.advwell.pro/health"
