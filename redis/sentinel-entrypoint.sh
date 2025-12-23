#!/bin/sh
# Sentinel Entrypoint Script
# Substitutes environment variables and starts Sentinel

set -e

# Substitute REDIS_PASSWORD using sed (envsubst not available in Alpine)
sed "s/\${REDIS_PASSWORD}/${REDIS_PASSWORD}/g" /etc/redis/sentinel.conf.tmpl > /tmp/sentinel.conf

# Make the config writable (Sentinel updates it during runtime)
chmod 666 /tmp/sentinel.conf

echo "Starting Redis Sentinel..."
echo "Monitoring master: redis:6379"

# Start Sentinel
exec redis-sentinel /tmp/sentinel.conf
