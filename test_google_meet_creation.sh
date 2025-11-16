#!/bin/bash

echo "🧪 Testando criação de evento Google Meet..."
echo ""

# 1. Login
echo "🔐 Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@advwell.pro",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login!"
  exit 1
fi

echo "✅ Login bem-sucedido!"
echo ""

# 2. Criar evento Google Meet
echo "📅 Criando evento Google Meet..."
CREATE_RESPONSE=$(curl -s -X POST https://api.advwell.pro/api/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reunião Google Meet - Teste Automático",
    "description": "Esta é uma reunião de teste para verificar a geração automática do link do Google Meet",
    "type": "GOOGLE_MEET",
    "date": "2024-11-25T10:00:00",
    "endDate": "2024-11-25T11:00:00"
  }')

echo "Response:"
echo "$CREATE_RESPONSE"
echo ""

# 3. Verificar se o link foi gerado
GOOGLE_MEET_LINK=$(echo "$CREATE_RESPONSE" | grep -o '"googleMeetLink":"[^"]*' | cut -d'"' -f4)

if [ -n "$GOOGLE_MEET_LINK" ]; then
  echo "✅ SUCESSO! Link do Google Meet foi gerado automaticamente!"
  echo ""
  echo "🔗 Link gerado:"
  echo "$GOOGLE_MEET_LINK"
  echo ""
  echo "📋 Formato do link:"
  if [[ $GOOGLE_MEET_LINK == *"calendar.google.com/calendar/u/0/r/eventedit"* ]]; then
    echo "✅ Formato correto: URL do Google Calendar"
  else
    echo "❌ Formato incorreto"
  fi
else
  echo "❌ Link do Google Meet NÃO foi gerado!"
  echo "Response completo:"
  echo "$CREATE_RESPONSE"
fi
