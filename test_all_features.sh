#!/bin/bash

API_URL="https://api.advwell.pro/api"
TOKEN=""
CLIENT_ID=""
CASE_ID=""
ACCOUNT_PAYABLE_ID=""
DOCUMENT_ID=""
SCHEDULE_ID=""

PASSED=0
FAILED=0

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando testes completos do sistema AdvWell${NC}\n"
echo "============================================================"

test() {
    local name="$1"
    local command="$2"

    echo -e "\n${YELLOW}🧪 Testando: ${name}${NC}"

    if eval "$command" > /tmp/test_output.json 2>&1; then
        echo -e "${GREEN}✅ ${name} - PASSOU${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ ${name} - FALHOU${NC}"
        cat /tmp/test_output.json 2>/dev/null | head -20
        ((FAILED++))
        return 1
    fi
}

# 1. AUTENTICAÇÃO
echo -e "\n${BLUE}📋 FASE 1: AUTENTICAÇÃO${NC}"

test "Login" "curl -sk -X POST $API_URL/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"teste.sistema.completo@advwell.test\",\"password\":\"TesteSistema@123\"}' \
    -o /tmp/login.json && cat /tmp/login.json | grep -q token"

TOKEN=$(cat /tmp/login.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "   Token: ${TOKEN:0:30}..."

# 2. CLIENTES
echo -e "\n${BLUE}📋 FASE 2: CLIENTES${NC}"

test "Criar Cliente" "curl -sk -X POST $API_URL/clients \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"name\":\"Cliente Teste Completo $(date +%s)\",
        \"cpf\":\"12345678901\",
        \"email\":\"cliente.teste@advwell.pro\",
        \"phone\":\"(21) 98765-4321\",
        \"address\":\"Rua Teste, 123\",
        \"birthDate\":\"1990-01-15\",
        \"notes\":\"Cliente criado em teste completo\"
    }' -o /tmp/client.json && cat /tmp/client.json | grep -q id"

CLIENT_ID=$(cat /tmp/client.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Cliente ID: $CLIENT_ID"

test "Listar Clientes" "curl -sk -X GET $API_URL/clients \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

test "Buscar Cliente" "curl -sk -X GET $API_URL/clients/$CLIENT_ID \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q id"

test "Atualizar Cliente" "curl -sk -X PUT $API_URL/clients/$CLIENT_ID \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"name\":\"Cliente Teste Atualizado\",
        \"cpf\":\"12345678901\",
        \"email\":\"cliente.teste@advwell.pro\",
        \"phone\":\"(21) 98765-4321\",
        \"address\":\"Rua Teste, 456\"
    }' | grep -q id"

# 3. PROCESSOS
echo -e "\n${BLUE}📋 FASE 3: PROCESSOS${NC}"

test "Criar Processo" "curl -sk -X POST $API_URL/cases \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"processNumber\":\"1234567-89.2025.8.19.000'$(date +%N)'\",
        \"clientId\":\"'$CLIENT_ID'\",
        \"tribunal\":\"TJRJ\",
        \"subject\":\"Ação de Teste Completo\",
        \"value\":50000.00,
        \"status\":\"ACTIVE\",
        \"notes\":\"Processo criado para teste\"
    }' -o /tmp/case.json && cat /tmp/case.json | grep -q id"

CASE_ID=$(cat /tmp/case.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Processo ID: $CASE_ID"

test "Listar Processos" "curl -sk -X GET $API_URL/cases \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

test "Buscar Processo" "curl -sk -X GET $API_URL/cases/$CASE_ID \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q id"

test "Adicionar Parte - Autor" "curl -sk -X POST $API_URL/cases/$CASE_ID/parts \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"type\":\"AUTOR\",
        \"name\":\"João da Silva Teste\",
        \"cpfCnpj\":\"98765432100\",
        \"email\":\"joao@teste.com\",
        \"phone\":\"(21) 99999-8888\",
        \"civilStatus\":\"Casado\",
        \"profession\":\"Engenheiro\",
        \"rg\":\"123456789\",
        \"birthDate\":\"1985-05-10\"
    }' | grep -q id"

test "Adicionar Parte - Réu" "curl -sk -X POST $API_URL/cases/$CASE_ID/parts \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"type\":\"REU\",
        \"name\":\"Maria Santos Teste\",
        \"cpfCnpj\":\"11122233344\",
        \"phone\":\"(21) 88888-7777\"
    }' | grep -q id"

test "Listar Partes" "curl -sk -X GET $API_URL/cases/$CASE_ID/parts \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

# 4. FINANCEIRO
echo -e "\n${BLUE}📋 FASE 4: FINANCEIRO${NC}"

test "Criar Receita" "curl -sk -X POST $API_URL/financial \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"type\":\"INCOME\",
        \"description\":\"Honorários - Teste\",
        \"amount\":15000.00,
        \"date\":\"'$(date -Iseconds)'\",
        \"clientId\":\"'$CLIENT_ID'\",
        \"caseId\":\"'$CASE_ID'\"
    }' | grep -q id"

test "Criar Despesa" "curl -sk -X POST $API_URL/financial \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"type\":\"EXPENSE\",
        \"description\":\"Custas - Teste\",
        \"amount\":500.00,
        \"date\":\"'$(date -Iseconds)'\",
        \"clientId\":\"'$CLIENT_ID'\"
    }' | grep -q id"

test "Listar Transações" "curl -sk -X GET $API_URL/financial \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q data"

test "Obter Resumo Financeiro" "curl -sk -X GET '$API_URL/financial?limit=10' \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q summary"

# 5. CONTAS A PAGAR (NOVA FUNCIONALIDADE)
echo -e "\n${BLUE}📋 FASE 5: CONTAS A PAGAR (NOVA)${NC}"

FUTURE_DATE=$(date -d "+15 days" -Iseconds)

test "Criar Conta a Pagar - Aluguel" "curl -sk -X POST $API_URL/accounts-payable \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"supplier\":\"Imobiliária Teste Ltda\",
        \"description\":\"Aluguel do escritório - Teste\",
        \"amount\":3500.00,
        \"dueDate\":\"'$FUTURE_DATE'\",
        \"category\":\"Aluguel\",
        \"notes\":\"Conta de teste\"
    }' -o /tmp/account.json && cat /tmp/account.json | grep -q id"

ACCOUNT_PAYABLE_ID=$(cat /tmp/account.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Conta a Pagar ID: $ACCOUNT_PAYABLE_ID"

test "Criar Conta a Pagar - Salários" "curl -sk -X POST $API_URL/accounts-payable \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"supplier\":\"Funcionários\",
        \"description\":\"Folha de pagamento - Teste\",
        \"amount\":8500.00,
        \"dueDate\":\"'$(date -d '+5 days' -Iseconds)'\",
        \"category\":\"Salários\"
    }' | grep -q id"

test "Criar Conta a Pagar - Fornecedores" "curl -sk -X POST $API_URL/accounts-payable \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"supplier\":\"Papelaria XYZ\",
        \"description\":\"Material de escritório\",
        \"amount\":450.00,
        \"dueDate\":\"'$(date -d '+30 days' -Iseconds)'\",
        \"category\":\"Fornecedores\"
    }' | grep -q id"

test "Listar Contas a Pagar" "curl -sk -X GET $API_URL/accounts-payable \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q data"

test "Buscar Conta a Pagar" "curl -sk -X GET $API_URL/accounts-payable/$ACCOUNT_PAYABLE_ID \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q supplier"

test "Atualizar Conta a Pagar" "curl -sk -X PUT $API_URL/accounts-payable/$ACCOUNT_PAYABLE_ID \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"supplier\":\"Imobiliária Teste Ltda\",
        \"description\":\"Aluguel do escritório - ATUALIZADO\",
        \"amount\":3800.00,
        \"dueDate\":\"'$FUTURE_DATE'\",
        \"category\":\"Aluguel\"
    }' | grep -q id"

test "Marcar Conta como Paga" "curl -sk -X POST $API_URL/accounts-payable/$ACCOUNT_PAYABLE_ID/pay \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{\"paidDate\":\"'$(date -Iseconds)'\"}' \
    | grep -q PAID"

test "Filtrar Contas - Status PAID" "curl -sk -X GET '$API_URL/accounts-payable?status=PAID' \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q data"

test "Filtrar Contas - Status PENDING" "curl -sk -X GET '$API_URL/accounts-payable?status=PENDING' \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q data"

# 6. DOCUMENTOS
echo -e "\n${BLUE}📋 FASE 6: DOCUMENTOS${NC}"

test "Criar Documento - Google Drive" "curl -sk -X POST $API_URL/documents \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"name\":\"Procuração - Teste\",
        \"description\":\"Documento teste Google Drive\",
        \"storageType\":\"link\",
        \"externalUrl\":\"https://drive.google.com/file/d/test123\",
        \"externalType\":\"google_drive\",
        \"clientId\":\"'$CLIENT_ID'\",
        \"caseId\":\"'$CASE_ID'\"
    }' -o /tmp/doc.json && cat /tmp/doc.json | grep -q id"

DOCUMENT_ID=$(cat /tmp/doc.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Documento ID: $DOCUMENT_ID"

test "Criar Documento - Google Docs" "curl -sk -X POST $API_URL/documents \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"name\":\"Contrato - Teste\",
        \"description\":\"Google Docs\",
        \"storageType\":\"link\",
        \"externalUrl\":\"https://docs.google.com/document/d/test456\",
        \"externalType\":\"google_docs\",
        \"clientId\":\"'$CLIENT_ID'\"
    }' | grep -q id"

test "Listar Documentos" "curl -sk -X GET $API_URL/documents \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q data"

test "Buscar Docs por Cliente" "curl -sk -X GET '$API_URL/documents/search?clientId=$CLIENT_ID' \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

test "Buscar Docs por Processo" "curl -sk -X GET '$API_URL/documents/search?caseId=$CASE_ID' \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

# 7. AGENDA
echo -e "\n${BLUE}📋 FASE 7: AGENDA${NC}"

test "Criar Compromisso" "curl -sk -X POST $API_URL/schedule \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"title\":\"Reunião - Teste\",
        \"description\":\"Reunião de teste\",
        \"type\":\"COMPROMISSO\",
        \"startDate\":\"'$(date -d '+2 days' -Iseconds)'\",
        \"endDate\":\"'$(date -d '+2 days +1 hour' -Iseconds)'\",
        \"location\":\"Escritório\",
        \"clientId\":\"'$CLIENT_ID'\"
    }' -o /tmp/schedule.json && cat /tmp/schedule.json | grep -q id"

SCHEDULE_ID=$(cat /tmp/schedule.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Compromisso ID: $SCHEDULE_ID"

test "Criar Audiência" "curl -sk -X POST $API_URL/schedule \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"title\":\"Audiência - Teste\",
        \"type\":\"AUDIENCIA\",
        \"startDate\":\"'$(date -d '+10 days' -Iseconds)'\",
        \"endDate\":\"'$(date -d '+10 days +2 hours' -Iseconds)'\",
        \"location\":\"Fórum\",
        \"caseId\":\"'$CASE_ID'\"
    }' | grep -q id"

test "Criar Prazo" "curl -sk -X POST $API_URL/schedule \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"title\":\"Prazo - Teste\",
        \"type\":\"PRAZO\",
        \"startDate\":\"'$(date -d '+20 days' -Iseconds)'\",
        \"caseId\":\"'$CASE_ID'\"
    }' | grep -q id"

test "Criar Google Meet" "curl -sk -X POST $API_URL/schedule \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"title\":\"Reunião Online - Teste\",
        \"type\":\"GOOGLE_MEET\",
        \"startDate\":\"'$(date -d '+3 days' -Iseconds)'\",
        \"endDate\":\"'$(date -d '+3 days +1 hour' -Iseconds)'\",
        \"clientId\":\"'$CLIENT_ID'\"
    }' | grep -q id"

test "Listar Eventos" "curl -sk -X GET $API_URL/schedule \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

# 8. DASHBOARD
echo -e "\n${BLUE}📋 FASE 8: DASHBOARD${NC}"

test "Atividades Recentes" "curl -sk -X GET $API_URL/dashboard/activities \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q '\['"

# 9. CONFIGURAÇÕES
echo -e "\n${BLUE}📋 FASE 9: CONFIGURAÇÕES${NC}"

test "Buscar Config da Empresa" "curl -sk -X GET $API_URL/companies/own \
    -H 'Authorization: Bearer $TOKEN' \
    | grep -q name"

test "Atualizar Configurações" "curl -sk -X PUT $API_URL/companies/own \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{
        \"phone\":\"(21) 3333-4444\",
        \"address\":\"Av. Teste, 1000\",
        \"city\":\"Rio de Janeiro\",
        \"state\":\"RJ\",
        \"zipCode\":\"20000-000\"
    }' | grep -q id"

# RESUMO FINAL
echo -e "\n============================================================"
echo -e "\n${BLUE}📊 RESUMO DOS TESTES${NC}"
echo "============================================================"
echo -e "${GREEN}✅ Testes Passaram: $PASSED${NC}"
echo -e "${RED}❌ Testes Falharam: $FAILED${NC}"

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")
    echo -e "${YELLOW}📈 Taxa de Sucesso: $SUCCESS_RATE%${NC}"
fi

echo -e "\n============================================================"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 TODOS OS TESTES PASSARAM! Sistema funcionando 100%${NC}"
else
    echo -e "\n${YELLOW}⚠️  ALGUNS TESTES FALHARAM. Verificar logs acima.${NC}"
fi

echo -e "\n${BLUE}📝 IDs Criados para Referência:${NC}"
echo "CLIENT_ID: $CLIENT_ID"
echo "CASE_ID: $CASE_ID"
echo "ACCOUNT_PAYABLE_ID: $ACCOUNT_PAYABLE_ID"
echo "DOCUMENT_ID: $DOCUMENT_ID"
echo "SCHEDULE_ID: $SCHEDULE_ID"

exit $FAILED
