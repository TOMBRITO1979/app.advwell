#!/bin/bash
set -a
source /root/advtom/.env
set +a
docker stack deploy -c /root/advtom/docker-compose.yml advtom
