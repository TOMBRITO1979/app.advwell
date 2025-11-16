#!/bin/bash
cd /root/advtom
source .env
docker stack deploy -c docker-compose.yml advtom
