#!/bin/sh
# Sentinel Entrypoint Script
# Starts Sentinel without password authentication

set -e

# Copy template to writable location (Sentinel updates config during runtime)
cp /etc/redis/sentinel.conf.tmpl /tmp/sentinel.conf
chmod 666 /tmp/sentinel.conf

echo "Starting Redis Sentinel..."
echo "Monitoring master: redis:6379"

# Start Sentinel
exec redis-sentinel /tmp/sentinel.conf
