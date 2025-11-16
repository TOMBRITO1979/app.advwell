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

echo "✅ Login bem-sucedido!"
echo ""

# 2. Buscar eventos da agenda
echo "📅 Buscando eventos da agenda..."
EVENTS_RESPONSE=$(curl -s -X GET https://api.advwell.pro/api/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$EVENTS_RESPONSE"
echo ""

# 3. Verificar Google Meet
GOOGLE_MEET_COUNT=$(echo "$EVENTS_RESPONSE" | grep -c '"type":"GOOGLE_MEET"')

echo "🎯 Eventos Google Meet encontrados: $GOOGLE_MEET_COUNT"
echo ""

if [ "$GOOGLE_MEET_COUNT" -gt 0 ]; then
  echo "✅ SUCESSO! Sistema está funcionando!"
  echo ""
  echo "📋 Detalhes do Google Meet:"
  echo "$EVENTS_RESPONSE" | grep -A 5 '"type":"GOOGLE_MEET"' | head -10
else
  echo "❌ Nenhum evento Google Meet encontrado!"
fi

echo ""
echo "📊 Tipos de eventos encontrados:"
echo "- COMPROMISSO: $(echo "$EVENTS_RESPONSE" | grep -c '"type":"COMPROMISSO"')"
echo "- TAREFA: $(echo "$EVENTS_RESPONSE" | grep -c '"type":"TAREFA"')"
echo "- PRAZO: $(echo "$EVENTS_RESPONSE" | grep -c '"type":"PRAZO"')"
echo "- AUDIENCIA: $(echo "$EVENTS_RESPONSE" | grep -c '"type":"AUDIENCIA"')"
echo "- GOOGLE_MEET: $(echo "$EVENTS_RESPONSE" | grep -c '"type":"GOOGLE_MEET"')"
