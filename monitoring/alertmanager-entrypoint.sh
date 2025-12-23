#!/bin/sh
# Alertmanager entrypoint script
# Substitutes environment variables in config file before starting

set -e

# Create config directory if not exists
mkdir -p /etc/alertmanager

# Substitute environment variables using sed
sed -e "s|\${SMTP_HOST}|${SMTP_HOST}|g" \
    -e "s|\${SMTP_PORT}|${SMTP_PORT}|g" \
    -e "s|\${SMTP_FROM_EMAIL}|${SMTP_FROM_EMAIL}|g" \
    -e "s|\${SMTP_USER}|${SMTP_USER}|g" \
    -e "s|\${SMTP_PASSWORD}|${SMTP_PASSWORD}|g" \
    -e "s|\${ALERT_EMAIL}|${ALERT_EMAIL}|g" \
    /etc/alertmanager/alertmanager.yml.tmpl > /etc/alertmanager/alertmanager.yml

echo "Alertmanager config generated with SMTP_HOST=${SMTP_HOST}, ALERT_EMAIL=${ALERT_EMAIL}"

# Start Alertmanager
exec /bin/alertmanager "$@"
