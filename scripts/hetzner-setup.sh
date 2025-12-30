#!/bin/bash
# =============================================================================
# AdvWell - Script de Setup para Hetzner (16GB Server)
# Instala: Docker, Swarm, Traefik, Portainer
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "============================================="
echo "  AdvWell - Setup Hetzner VPS"
echo "  Servidor: 16GB RAM / 4 vCPU"
echo "============================================="
echo -e "${NC}"

# -----------------------------------------------------------------------------
# 1. Atualizar sistema
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Atualizando sistema...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git htop nano

# -----------------------------------------------------------------------------
# 2. Instalar Docker
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] Instalando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker instalado com sucesso!${NC}"
else
    echo -e "${GREEN}Docker já está instalado.${NC}"
fi

# Mostrar versão
docker --version

# -----------------------------------------------------------------------------
# 3. Inicializar Docker Swarm
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] Inicializando Docker Swarm...${NC}"
if docker info | grep -q "Swarm: active"; then
    echo -e "${GREEN}Swarm já está ativo.${NC}"
else
    docker swarm init
    echo -e "${GREEN}Swarm inicializado!${NC}"
fi

# -----------------------------------------------------------------------------
# 4. Criar rede overlay
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] Criando rede overlay...${NC}"
if docker network ls | grep -q "network_public"; then
    echo -e "${GREEN}Rede network_public já existe.${NC}"
else
    docker network create --driver overlay --attachable network_public
    echo -e "${GREEN}Rede network_public criada!${NC}"
fi

# -----------------------------------------------------------------------------
# 5. Deploy Traefik
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] Instalando Traefik...${NC}"

# Criar diretório para certificados
mkdir -p /opt/traefik
touch /opt/traefik/acme.json
chmod 600 /opt/traefik/acme.json

# Criar stack do Traefik
cat > /opt/traefik/docker-compose.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=network_public"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencryptresolver.acme.email=${ACME_EMAIL:-admin@advwell.pro}"
      - "--certificatesresolvers.letsencryptresolver.acme.storage=/letsencrypt/acme.json"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/acme.json:/letsencrypt/acme.json
    networks:
      - network_public
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      labels:
        - "traefik.enable=true"
        # Dashboard (opcional - acessar via traefik.seudominio.com)
        # - "traefik.http.routers.traefik.rule=Host(`traefik.advwell.pro`)"
        # - "traefik.http.routers.traefik.entrypoints=websecure"
        # - "traefik.http.routers.traefik.tls.certresolver=letsencryptresolver"
        # - "traefik.http.routers.traefik.service=api@internal"
        # - "traefik.http.services.traefik.loadbalancer.server.port=8080"

networks:
  network_public:
    external: true
EOF

# Deploy Traefik
docker stack deploy -c /opt/traefik/docker-compose.yml traefik
echo -e "${GREEN}Traefik instalado!${NC}"

# -----------------------------------------------------------------------------
# 6. Deploy Portainer
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/6] Instalando Portainer...${NC}"

mkdir -p /opt/portainer

cat > /opt/portainer/docker-compose.yml << 'EOF'
version: '3.8'

services:
  agent:
    image: portainer/agent:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global
      placement:
        constraints: [node.platform.os == linux]

  portainer:
    image: portainer/portainer-ce:latest
    command: -H tcp://tasks.agent:9001 --tlsskipverify
    ports:
      # Acesso direto por IP enquanto DNS aponta para outro servidor
      - "9000:9000"
    volumes:
      - portainer_data:/data
    networks:
      - agent_network
      - network_public
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints: [node.role == manager]
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.portainer.rule=Host(`portainer.advwell.pro`)"
        - "traefik.http.routers.portainer.entrypoints=websecure"
        - "traefik.http.routers.portainer.tls=true"
        - "traefik.http.routers.portainer.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.portainer.loadbalancer.server.port=9000"
        - "traefik.docker.network=network_public"

networks:
  agent_network:
    driver: overlay
    attachable: true
  network_public:
    external: true

volumes:
  portainer_data:
EOF

# Deploy Portainer
docker stack deploy -c /opt/portainer/docker-compose.yml portainer
echo -e "${GREEN}Portainer instalado!${NC}"

# -----------------------------------------------------------------------------
# Resumo Final
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  SETUP COMPLETO!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Serviços instalados:${NC}"
echo "  - Docker Swarm: ativo"
echo "  - Traefik: rodando (SSL automático)"
echo "  - Portainer: rodando"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo ""
echo "  1. Configure o DNS:"
echo "     - portainer.advwell.pro -> $(curl -s ifconfig.me)"
echo "     - app.advwell.pro       -> $(curl -s ifconfig.me)"
echo "     - api.advwell.pro       -> $(curl -s ifconfig.me)"
echo "     - grafana.advwell.pro   -> $(curl -s ifconfig.me)"
echo ""
echo "  2. Acesse o Portainer:"
echo "     https://portainer.advwell.pro"
echo ""
echo "  3. Clone o repositório AdvWell:"
echo "     cd /opt"
echo "     git clone https://github.com/TOMBRITO1979/app.advwell.git"
echo "     cd app.advwell"
echo "     cp .env.example .env"
echo "     nano .env  # Configure as variáveis"
echo ""
echo "  4. Deploy do AdvWell (via Portainer ou CLI):"
echo "     ./deploy.sh"
echo ""
echo -e "${GREEN}=============================================${NC}"
