#!/bin/bash

echo "🔐 Testando login SUPER_ADMIN..."
echo ""

RESPONSE=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"appadvwell@gmail.com","password":"Contadeva123!"}')

echo "Resposta da API:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "token"; then
  echo ""
  echo "✅ LOGIN REALIZADO COM SUCESSO!"
  echo ""
  echo "Token JWT obtido ✓"

  USER_NAME=$(echo "$RESPONSE" | jq -r '.user.name' 2>/dev/null)
  USER_ROLE=$(echo "$RESPONSE" | jq -r '.user.role' 2>/dev/null)

  echo "Nome: $USER_NAME"
  echo "Role: $USER_ROLE"
else
  echo ""
  echo "❌ ERRO NO LOGIN"
  echo "Verifique as credenciais ou veja a resposta acima"
fi
