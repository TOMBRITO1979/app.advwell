#!/bin/bash

# Script para gerar API Key para uma empresa
# Uso: ./generate_api_key.sh email@empresa.com

if [ -z "$1" ]; then
  echo "❌ Erro: Email da empresa não fornecido"
  echo ""
  echo "Uso: ./generate_api_key.sh email@empresa.com"
  echo ""
  echo "Exemplo:"
  echo "  ./generate_api_key.sh admin@minhaempresa.com"
  exit 1
fi

EMAIL="$1"

echo ""
echo "🔑 Gerando API Key para empresa com email: $EMAIL"
echo ""

# Conectar ao banco e gerar API Key
RESULT=$(docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -t -c "
UPDATE companies
SET \"apiKey\" = gen_random_uuid()::text
WHERE email = '$EMAIL'
RETURNING id, name, email, \"apiKey\";
")

if [ -z "$RESULT" ]; then
  echo "❌ Erro: Empresa não encontrada com email $EMAIL"
  echo ""
  echo "Verificar empresas cadastradas:"
  echo "  docker exec -it \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, name, email FROM companies;'"
  exit 1
fi

echo "✅ API Key gerada com sucesso!"
echo ""
echo "$RESULT" | awk '{print "ID:      ", $1; print "Nome:    ", $2; print "Email:   ", $3; print "API Key: ", $4}'
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Guarde esta API Key em local seguro"
echo "   - Não compartilhe publicamente"
echo "   - Use apenas em chamadas server-to-server"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configure a API Key no Chatwoot"
echo "   2. Teste os endpoints com: API_KEY=<chave> node test_integration.js"
echo "   3. Configure os webhooks conforme INTEGRACAO_CHATWOOT.md"
echo ""
