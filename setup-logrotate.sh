#!/bin/bash

echo "🔄 Configurando Log Rotation para Docker"
echo "========================================"

# Criar arquivo de configuração do logrotate para Docker
cat > /etc/logrotate.d/docker <<'EOF'
/var/lib/docker/containers/*/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    maxsize 100M
}
EOF

echo "✅ Configuração de logrotate criada em /etc/logrotate.d/docker"

# Configurar Docker daemon para limitar tamanho de logs
echo ""
echo "📝 Criando configuração do Docker daemon..."

mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3",
    "compress": "true"
  },
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ]
}
EOF

echo "✅ Configuração do Docker daemon criada"

# Verificar se precisa restartar Docker
echo ""
read -p "⚠️  Deseja reiniciar o Docker para aplicar as configurações? (s/N): " restart

if [[ "$restart" =~ ^[Ss]$ ]]; then
  echo "🔄 Reiniciando Docker..."
  systemctl restart docker
  sleep 5
  echo "✅ Docker reiniciado com sucesso"

  # Verificar status
  systemctl status docker --no-pager -l | head -10
else
  echo "ℹ️  Docker não foi reiniciado."
  echo "   Execute 'systemctl restart docker' manualmente quando possível."
fi

echo ""
echo "✅ Configuração de log rotation concluída!"
echo ""
echo "📊 Configurações aplicadas:"
echo "  - Logs rotacionados diariamente"
echo "  - Mantém últimos 7 dias"
echo "  - Tamanho máximo por arquivo: 50MB"
echo "  - Máximo de 3 arquivos por container"
echo "  - Compressão automática"
