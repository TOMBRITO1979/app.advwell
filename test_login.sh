#!/bin/bash

echo "=== Testando Login ==="
echo ""

# Test 1: Super Admin
echo "1. Super Admin (wasolutionscorp@gmail.com)"
curl -k -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wasolutionscorp@gmail.com","password":"Teste123!"}' \
  -s | jq -r '.token // .error' | head -c 100
echo ""
echo ""

# Test 2: Admin Costa
echo "2. Admin Costa (admin@costaassociados.adv.br)"
curl -k -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@costaassociados.adv.br","password":"Teste123!"}' \
  -s | jq -r '.token // .error' | head -c 100
echo ""
echo ""

# Test 3: Admin Mendes
echo "3. Admin Mendes (admin@mendespereira.com.br)"
curl -k -X POST https://api.advwell.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mendespereira.com.br","password":"Teste123!"}' \
  -s | jq -r '.token // .error' | head -c 100
echo ""
