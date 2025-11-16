#!/bin/bash

# Script para Criar Backup Completo do Sistema AdvTom
# Uso: ./criar_backup.sh [nome_opcional]

set -e  # Exit on error

# Configurações
BACKUP_BASE_DIR="/root/advtom/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${1:-"backup"}
BACKUP_DIR="$BACKUP_BASE_DIR/${TIMESTAMP}_${BACKUP_NAME}"

echo "======================================"
echo "CRIANDO BACKUP DO SISTEMA ADVTOM"
echo "======================================"
echo ""
echo "📅 Data: $(date)"
echo "📍 Diretório: $BACKUP_DIR"
echo ""

# Criar diretório de backup
mkdir -p $BACKUP_DIR
echo "✅ Diretório criado: $BACKUP_DIR"
echo ""

# 1. Backup do Banco de Dados
echo "1️⃣  Fazendo backup do banco de dados PostgreSQL..."
POSTGRES_CONTAINER=$(docker ps -q -f name=advtom_postgres)
if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ ERRO: Container PostgreSQL não encontrado!"
    echo "   Verifique se o sistema está rodando: docker service ls"
    exit 1
fi

docker exec $POSTGRES_CONTAINER pg_dump -U postgres -d advtom > $BACKUP_DIR/database_backup.sql
LINES=$(wc -l < $BACKUP_DIR/database_backup.sql)
echo "   ✅ Banco de dados exportado: $LINES linhas"
echo ""

# 2. Backup do Código Backend
echo "2️⃣  Fazendo backup do código backend..."
if [ -d "/root/advtom/backend" ]; then
    tar -czf $BACKUP_DIR/backend_code.tar.gz -C /root/advtom backend
    SIZE=$(ls -lh $BACKUP_DIR/backend_code.tar.gz | awk '{print $5}')
    echo "   ✅ Backend: $SIZE"
else
    echo "   ⚠️  Diretório backend não encontrado"
fi
echo ""

# 3. Backup do Código Frontend
echo "3️⃣  Fazendo backup do código frontend..."
if [ -d "/root/advtom/frontend" ]; then
    tar -czf $BACKUP_DIR/frontend_code.tar.gz -C /root/advtom frontend
    SIZE=$(ls -lh $BACKUP_DIR/frontend_code.tar.gz | awk '{print $5}')
    echo "   ✅ Frontend: $SIZE"
else
    echo "   ⚠️  Diretório frontend não encontrado"
fi
echo ""

# 4. Backup das Configurações Docker
echo "4️⃣  Fazendo backup das configurações Docker..."
cp /root/advtom/docker-compose.yml $BACKUP_DIR/ 2>/dev/null || echo "   ⚠️  docker-compose.yml não encontrado"

# Exportar configurações dos serviços
docker service inspect advtom_backend > $BACKUP_DIR/service_backend.json 2>/dev/null || echo "   ⚠️  Serviço backend não encontrado"
docker service inspect advtom_frontend > $BACKUP_DIR/service_frontend.json 2>/dev/null || echo "   ⚠️  Serviço frontend não encontrado"
docker service inspect advtom_postgres > $BACKUP_DIR/service_postgres.json 2>/dev/null || echo "   ⚠️  Serviço postgres não encontrado"

echo "   ✅ Configurações exportadas"
echo ""

# 5. Listar e salvar informações das imagens
echo "5️⃣  Salvando informações das imagens Docker..."
docker images | grep advtom > $BACKUP_DIR/docker_images.txt 2>/dev/null || echo "" > $BACKUP_DIR/docker_images.txt
echo "   ✅ Lista de imagens salva"
echo ""

# 6. Exportar Imagens Docker
echo "6️⃣  Exportando imagens Docker (isso pode demorar alguns minutos)..."

# Frontend
FRONTEND_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}\t{{.ID}}" | grep "advtom-frontend:latest" | awk '{print $2}')
if [ ! -z "$FRONTEND_IMAGE" ]; then
    echo "   📦 Exportando frontend (ID: $FRONTEND_IMAGE)..."
    docker save $FRONTEND_IMAGE -o $BACKUP_DIR/frontend_image.tar
    SIZE=$(ls -lh $BACKUP_DIR/frontend_image.tar | awk '{print $5}')
    echo "   ✅ Frontend exportado: $SIZE"
else
    echo "   ⚠️  Imagem frontend não encontrada"
fi

# Backend
BACKEND_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}\t{{.ID}}" | grep "advtom-backend:latest" | head -1 | awk '{print $2}')
if [ ! -z "$BACKEND_IMAGE" ]; then
    echo "   📦 Exportando backend (ID: $BACKEND_IMAGE)..."
    docker save $BACKEND_IMAGE -o $BACKUP_DIR/backend_image.tar
    SIZE=$(ls -lh $BACKUP_DIR/backend_image.tar | awk '{print $5}')
    echo "   ✅ Backend exportado: $SIZE"
else
    echo "   ⚠️  Imagem backend não encontrada"
fi
echo ""

# 7. Criar arquivo de informações do backup
echo "7️⃣  Criando documentação do backup..."
cat > $BACKUP_DIR/BACKUP_INFO.txt << EOF
====================================
BACKUP DO SISTEMA ADVTOM
====================================

Data: $(date)
Diretório: $BACKUP_DIR
Nome: $BACKUP_NAME

CONTEÚDO:
---------
✅ database_backup.sql      - Backup completo do PostgreSQL
✅ backend_code.tar.gz      - Código fonte backend
✅ frontend_code.tar.gz     - Código fonte frontend
✅ frontend_image.tar       - Imagem Docker frontend
✅ backend_image.tar        - Imagem Docker backend
✅ docker-compose.yml       - Configuração do stack
✅ service_*.json           - Configurações dos serviços
✅ docker_images.txt        - Lista de imagens

COMO RESTAURAR:
--------------
1. Script automático (recomendado):
   cp $BACKUP_DIR/restore.sh /tmp/
   chmod +x /tmp/restore.sh
   /tmp/restore.sh

2. Manual:
   - Veja: /root/advtom/RESTORE_RAPIDO.md
   - Ou: /root/advtom/CLAUDE.md (seção "Database Backup & System Restore")

VERIFICAÇÃO:
-----------
- Status dos serviços: docker service ls --filter name=advtom
- API Health: curl -k https://api.advtom.com/health
- Logs: docker service logs advtom_backend -f

====================================
EOF

# Copiar script de restore para o backup
if [ -f "/root/advtom/backups/20251030_194403_sistema_funcional/restore.sh" ]; then
    cp /root/advtom/backups/20251030_194403_sistema_funcional/restore.sh $BACKUP_DIR/
    # Atualizar caminho do backup no script
    sed -i "s|/root/advtom/backups/20251030_194403_sistema_funcional|$BACKUP_DIR|g" $BACKUP_DIR/restore.sh
    chmod +x $BACKUP_DIR/restore.sh
    echo "   ✅ Script de restore copiado e atualizado"
fi
echo ""

# 8. Estatísticas do backup
echo "8️⃣  Calculando estatísticas..."
TOTAL_SIZE=$(du -sh $BACKUP_DIR | awk '{print $1}')
FILE_COUNT=$(ls -1 $BACKUP_DIR | wc -l)
echo "   📊 Tamanho total: $TOTAL_SIZE"
echo "   📄 Arquivos: $FILE_COUNT"
echo ""

# Resumo final
echo "======================================"
echo "✅ BACKUP CONCLUÍDO COM SUCESSO!"
echo "======================================"
echo ""
echo "📍 Local: $BACKUP_DIR"
echo "📊 Tamanho: $TOTAL_SIZE"
echo "📄 Arquivos: $FILE_COUNT"
echo ""
echo "🔄 Para restaurar:"
echo "   $BACKUP_DIR/restore.sh"
echo ""
echo "📚 Documentação:"
echo "   $BACKUP_DIR/BACKUP_INFO.txt"
echo "   /root/advtom/RESTORE_RAPIDO.md"
echo ""

# Listar conteúdo do backup
echo "📦 Conteúdo do backup:"
ls -lh $BACKUP_DIR
echo ""

echo "✅ Backup salvo com sucesso!"
echo ""
