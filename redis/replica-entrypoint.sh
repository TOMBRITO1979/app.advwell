#!/bin/sh
# Redis Replica Entrypoint Script
# Detects container IP and configures replica-announce-ip for proper Sentinel discovery

set -e

# Get container's IP address
CONTAINER_IP=$(hostname -i | awk '{print $1}')

echo "Container IP detected: $CONTAINER_IP"
echo "Starting Redis replica with announce-ip: $CONTAINER_IP"

# Start Redis with dynamic announce-ip
exec redis-server \
  --appendonly yes \
  --maxmemory 2gb \
  --maxmemory-policy allkeys-lru \
  --tcp-keepalive 300 \
  --requirepass "${REDIS_PASSWORD}" \
  --masterauth "${REDIS_PASSWORD}" \
  --replicaof redis 6379 \
  --tcp-backlog 511 \
  --replica-announce-ip "$CONTAINER_IP" \
  --replica-announce-port 6379
