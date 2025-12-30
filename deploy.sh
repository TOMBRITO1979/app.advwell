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
docker stack deploy -c docker-compose.yml advtom

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
echo "   Backend API: https://api.advwell.pro"
echo "   Health Check: https://api.advwell.pro/health"
