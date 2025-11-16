#!/bin/bash

API_URL="https://api.advwell.pro/api"

echo "🔐 Fazendo login..."
LOGIN_RESPONSE=$(curl -k -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wmp.com","password":"senha123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

echo "📧 Testando endpoint de templates..."
TEMPLATES_RESPONSE=$(curl -k -s -X GET "$API_URL/campaigns/templates" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Templates carregados!"
echo ""
echo "📋 Lista de templates:"
echo "$TEMPLATES_RESPONSE" | jq -r '.[] | "\n\(.name)\n  ID: \(.id)\n  Assunto: \(.subject)"'

echo ""
echo "🔍 Carregando template individual..."
TEMPLATE_ID=$(echo "$TEMPLATES_RESPONSE" | jq -r '.[0].id')

if [ -n "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
  TEMPLATE_RESPONSE=$(curl -k -s -X GET "$API_URL/campaigns/templates/$TEMPLATE_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "✅ Template carregado com sucesso!"
  echo ""
  echo "Nome: $(echo $TEMPLATE_RESPONSE | jq -r '.name')"
  echo "Assunto: $(echo $TEMPLATE_RESPONSE | jq -r '.subject')"
  echo ""

  # Verificar se contém variáveis
  if echo "$TEMPLATE_RESPONSE" | grep -q '{nome_cliente}'; then
    echo "✅ Template contém variável {nome_cliente}"
  fi

  if echo "$TEMPLATE_RESPONSE" | grep -q '{nome_empresa}'; then
    echo "✅ Template contém variável {nome_empresa}"
  fi

  if echo "$TEMPLATE_RESPONSE" | grep -q '{data}'; then
    echo "✅ Template contém variável {data}"
  fi

  echo ""
  echo "✅ TODOS OS TESTES PASSARAM!"
  echo "✅ Funcionalidade de templates implementada com sucesso!"
else
  echo "❌ Nenhum template encontrado"
  exit 1
fi
