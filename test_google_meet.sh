#!/bin/bash

echo "🧪 Testando Google Meet na Agenda..."
echo ""

# 1. Login
echo "🔐 Fazendo login com admin@advwell.pro..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@advwell.pro",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login bem-sucedido! Token obtido."
echo ""

# 2. Buscar eventos da agenda
echo "📅 Buscando eventos da agenda..."
EVENTS_RESPONSE=$(curl -s -X GET https://api.advwell.pro/api/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo $EVENTS_RESPONSE | jq '.'
echo ""

# 3. Filtrar Google Meet
echo "🎯 Filtrando eventos Google Meet..."
GOOGLE_MEETS=$(echo $EVENTS_RESPONSE | jq '[.[] | select(.type == "GOOGLE_MEET")]')

COUNT=$(echo $GOOGLE_MEETS | jq 'length')
echo "Total de eventos Google Meet: $COUNT"
echo ""

if [ "$COUNT" -gt 0 ]; then
  echo "✅ SUCESSO! Evento Google Meet encontrado:"
  echo $GOOGLE_MEETS | jq '.[0] | {title, type, date, description}'
else
  echo "❌ Nenhum evento Google Meet encontrado!"
fi

echo ""
echo "📊 RESUMO DE TIPOS:"
echo $EVENTS_RESPONSE | jq 'group_by(.type) | map({type: .[0].type, count: length})'
