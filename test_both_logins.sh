#!/bin/bash

echo "🔐 Testando logins..."
echo ""
echo "==================================================="
echo "1️⃣ TESTANDO: appadvwell@gmail.com"
echo "==================================================="

RESPONSE1=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"appadvwell@gmail.com","password":"REMOVED_CREDENTIAL"}')

if echo "$RESPONSE1" | grep -q "token"; then
  echo "✅ LOGIN OK - appadvwell@gmail.com"
  echo "$RESPONSE1" | jq -r '.user.name + " (" + .user.role + ")"'
else
  echo "❌ ERRO - appadvwell@gmail.com"
  echo "$RESPONSE1" | jq '.' 2>/dev/null || echo "$RESPONSE1"
fi

echo ""
echo "==================================================="
echo "2️⃣ TESTANDO: wasolutionscorp@gmail.com"
echo "==================================================="

# Tentar senhas comuns
for PASS in "123456" "password" "admin" "Admin123" "Admin123!" "advtom123"; do
  echo -n "Testando senha: $PASS ... "
  RESPONSE2=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"wasolutionscorp@gmail.com\",\"password\":\"$PASS\"}")

  if echo "$RESPONSE2" | grep -q "token"; then
    echo "✅ SENHA CORRETA: $PASS"
    echo "$RESPONSE2" | jq -r '.user.name + " (" + .user.role + ")"'
    break
  else
    echo "❌"
  fi
done

echo ""
echo "==================================================="
echo "3️⃣ TESTANDO: admin@costaassociados.adv.br"
echo "==================================================="

# Testar conta do Costa também
RESPONSE3=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@costaassociados.adv.br","password":"costa123"}')

if echo "$RESPONSE3" | grep -q "token"; then
  echo "✅ LOGIN OK - Costa"
  echo "$RESPONSE3" | jq -r '.user.name + " (" + .user.role + ")"'
else
  echo "❌ ERRO - Costa"
  echo "$RESPONSE3" | jq '.' 2>/dev/null || echo "$RESPONSE3"
fi
