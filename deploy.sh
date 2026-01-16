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

# Deploy the stack
echo "🔧 Deploying Docker stack..."
# Use docker compose config to properly interpolate env vars, then deploy
docker compose config > /tmp/docker-compose-resolved.yml
docker stack deploy -c /tmp/docker-compose-resolved.yml advtom
rm -f /tmp/docker-compose-resolved.yml

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
