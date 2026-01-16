#!/bin/sh
# Redis Master Entrypoint Script
# Configures Redis master with authentication

set -e

echo "Starting Redis master with authentication enabled"

# Start Redis with authentication
exec redis-server \
  --appendonly yes \
  --maxmemory 2gb \
  --maxmemory-policy allkeys-lru \
  --tcp-keepalive 300 \
  --requirepass "${REDIS_PASSWORD}" \
  --masterauth "${REDIS_PASSWORD}" \
  --tcp-backlog 511
