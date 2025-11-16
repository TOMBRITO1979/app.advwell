#!/bin/bash

API_URL="https://api.advwell.pro/api"
ERRORS=0
TESTS=0

echo "🧪 TESTE COMPLETO DO SISTEMA ADVWELL"
echo "===================================="
echo ""

# Função para testar endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local auth=$4
  local expected_code=$5

  TESTS=$((TESTS + 1))
  echo -n "[$TESTS] Testando $name... "

  if [ -z "$auth" ]; then
    response=$(curl -k -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
  else
    response=$(curl -k -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" -H "Authorization: Bearer $auth")
  fi

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "$expected_code" ]; then
    echo "✅ OK (HTTP $http_code)"
  else
    echo "❌ FALHOU (esperado $expected_code, recebido $http_code)"
    ERRORS=$((ERRORS + 1))
  fi
}

# Teste 1: Health Check
echo "🏥 TESTES DE SAÚDE"
echo "-------------------"
test_endpoint "Health Check" "GET" "/health" "" "200"
echo ""

# Teste 2: Endpoints Públicos (sem autenticação)
echo "🔓 TESTES DE ENDPOINTS PÚBLICOS"
echo "--------------------------------"
test_endpoint "Login (sem credenciais)" "POST" "/auth/login" "" "400"
test_endpoint "Register (sem dados)" "POST" "/auth/register" "" "400"
echo ""

# Teste 3: Criar conta de teste e fazer login
echo "🔐 TESTE DE AUTENTICAÇÃO"
echo "------------------------"

# Tentar login com credenciais de teste
LOGIN_RESPONSE=$(curl -k -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste.sistema.completo@advwell.test",
    "password": "senha123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "⚠️  Usuário de teste não existe, tentando criar..."

  # Criar novo usuário de teste
  REGISTER_RESPONSE=$(curl -k -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Sistema Teste Completo",
      "email": "teste.sistema.completo@advwell.test",
      "password": "senha123",
      "companyName": "Teste Automático LTDA"
    }')

  # Fazer login novamente
  LOGIN_RESPONSE=$(curl -k -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "teste.sistema.completo@advwell.test",
      "password": "senha123"
    }')

  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Não foi possível obter token de autenticação"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Login realizado com sucesso"
fi

echo ""

# Teste 4: Endpoints Protegidos (com autenticação)
echo "🔒 TESTES DE ENDPOINTS PROTEGIDOS"
echo "----------------------------------"

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  test_endpoint "GET Clients" "GET" "/clients" "$TOKEN" "200"
  test_endpoint "GET Cases" "GET" "/cases" "$TOKEN" "200"
  test_endpoint "GET Financial" "GET" "/financial" "$TOKEN" "200"
  test_endpoint "GET Documents" "GET" "/documents" "$TOKEN" "200"
  test_endpoint "GET Campaigns" "GET" "/campaigns" "$TOKEN" "200"
  test_endpoint "GET Campaign Templates" "GET" "/campaigns/templates" "$TOKEN" "200"
  test_endpoint "GET SMTP Config" "GET" "/smtp-config" "$TOKEN" "200"
  test_endpoint "GET Users" "GET" "/users" "$TOKEN" "200"
  test_endpoint "GET Companies (own)" "GET" "/companies/own" "$TOKEN" "200"
else
  echo "⚠️  Pulando testes protegidos (sem token)"
fi

echo ""

# Teste 5: Verificar Database
echo "🗄️  TESTES DE DATABASE"
echo "---------------------"

DB_TEST=$(docker exec $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c "SELECT COUNT(*) FROM users;" 2>&1)

if echo "$DB_TEST" | grep -q "count"; then
  USER_COUNT=$(echo "$DB_TEST" | grep -A 1 "count" | tail -1 | tr -d ' ')
  echo "✅ Database acessível ($USER_COUNT usuários cadastrados)"
else
  echo "❌ Erro ao acessar database"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Teste 6: Verificar Templates
echo "📧 TESTES DE TEMPLATES DE EMAIL"
echo "--------------------------------"

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  TEMPLATES_RESPONSE=$(curl -k -s -X GET "$API_URL/campaigns/templates" \
    -H "Authorization: Bearer $TOKEN")

  TEMPLATE_COUNT=$(echo "$TEMPLATES_RESPONSE" | grep -o '"id"' | wc -l)

  if [ "$TEMPLATE_COUNT" -eq "4" ]; then
    echo "✅ 4 templates encontrados (correto)"
    echo "   - pericia_marcada"
    echo "   - processo_pendente"
    echo "   - processo_finalizado"
    echo "   - audiencia_marcada"
  else
    echo "❌ Esperado 4 templates, encontrado $TEMPLATE_COUNT"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "⚠️  Pulando teste de templates (sem token)"
fi

echo ""

# Resumo Final
echo "=================================="
echo "📊 RESUMO DOS TESTES"
echo "=================================="
echo "Total de testes: $TESTS"
echo "Sucessos: $((TESTS - ERRORS))"
echo "Falhas: $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ TODOS OS TESTES PASSARAM!"
  exit 0
else
  echo "⚠️  $ERRORS TESTE(S) FALHARAM"
  exit 1
fi
