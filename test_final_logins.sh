#!/bin/bash

echo "🔐 TESTANDO TODOS OS LOGINS APÓS RESET"
echo "========================================"
echo ""

# Teste 1: appadvwell@gmail.com
echo "1️⃣ appadvwell@gmail.com (SUPER_ADMIN)"
echo "   Senha: Contadeva123!"
RESP1=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"appadvwell@gmail.com","password":"Contadeva123!"}')

if echo "$RESP1" | grep -q "token"; then
  echo "   ✅ LOGIN OK"
  echo "$RESP1" | jq -r '   "   Nome: " + .user.name + "\n   Role: " + .user.role'
else
  echo "   ❌ ERRO"
  echo "$RESP1" | jq '.'
fi

echo ""
echo "========================================"
echo ""

# Teste 2: wasolutionscorp@gmail.com
echo "2️⃣ wasolutionscorp@gmail.com (SUPER_ADMIN)"
echo "   Senha: Admin123!"
RESP2=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wasolutionscorp@gmail.com","password":"Admin123!"}')

if echo "$RESP2" | grep -q "token"; then
  echo "   ✅ LOGIN OK"
  echo "$RESP2" | jq -r '   "   Nome: " + .user.name + "\n   Role: " + .user.role'
else
  echo "   ❌ ERRO"
  echo "$RESP2" | jq '.'
fi

echo ""
echo "========================================"
echo ""

# Teste 3: admin@costaassociados.adv.br
echo "3️⃣ admin@costaassociados.adv.br (ADMIN)"
echo "   Senha: costa123"
RESP3=$(curl -k -s -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@costaassociados.adv.br","password":"costa123"}')

if echo "$RESP3" | grep -q "token"; then
  echo "   ✅ LOGIN OK"
  echo "$RESP3" | jq -r '   "   Nome: " + .user.name + "\n   Role: " + .user.role'
else
  echo "   ❌ ERRO"
  echo "$RESP3" | jq '.'
fi

echo ""
echo "========================================"
echo ""
echo "📝 RESUMO DAS CREDENCIAIS:"
echo ""
echo "🔑 SUPER_ADMIN #1:"
echo "   Email: appadvwell@gmail.com"
echo "   Senha: Contadeva123!"
echo ""
echo "🔑 SUPER_ADMIN #2:"
echo "   Email: wasolutionscorp@gmail.com"
echo "   Senha: Admin123!"
echo ""
echo "🔑 ADMIN (Costa):"
echo "   Email: admin@costaassociados.adv.br"
echo "   Senha: costa123"
echo ""
