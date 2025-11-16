#!/bin/bash

echo "🧪 TESTE DE INTEGRIDADE DO BANCO DE DADOS"
echo "=========================================="
echo ""

PSQL_CMD="docker exec $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom"

# Função para executar query e contar resultados
test_table() {
  local table=$1
  local description=$2

  count=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM $table;" 2>&1 | tr -d ' ')

  if [ -z "$count" ] || ! [[ "$count" =~ ^[0-9]+$ ]]; then
    echo "❌ $description: ERRO ao acessar tabela"
    return 1
  else
    echo "✅ $description: $count registros"
    return 0
  fi
}

echo "📊 TABELAS PRINCIPAIS"
echo "---------------------"
test_table "companies" "Companies (Empresas)"
test_table "users" "Users (Usuários)"
test_table "clients" "Clients (Clientes)"
test_table "cases" "Cases (Processos)"
test_table "\"FinancialTransaction\"" "Financial Transactions"
test_table "documents" "Documents (Documentos)"
test_table "email_campaigns" "Email Campaigns"
test_table "smtp_configs" "SMTP Configs"
echo ""

echo "🔗 INTEGRIDADE DE RELAÇÕES"
echo "--------------------------"

# Verificar se há clientes órfãos (sem empresa)
orphan_clients=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM clients c LEFT JOIN companies co ON c.\"companyId\" = co.id WHERE co.id IS NULL;" | tr -d ' ')
if [ "$orphan_clients" = "0" ]; then
  echo "✅ Nenhum cliente órfão encontrado"
else
  echo "⚠️  $orphan_clients clientes sem empresa associada"
fi

# Verificar se há cases órfãos
orphan_cases=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM cases c LEFT JOIN companies co ON c.\"companyId\" = co.id WHERE co.id IS NULL;" | tr -d ' ')
if [ "$orphan_cases" = "0" ]; then
  echo "✅ Nenhum processo órfão encontrado"
else
  echo "⚠️  $orphan_cases processos sem empresa associada"
fi

# Verificar se há usuários órfãos
orphan_users=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users u LEFT JOIN companies c ON u.\"companyId\" = c.id WHERE c.id IS NULL;" | tr -d ' ')
if [ "$orphan_users" = "0" ]; then
  echo "✅ Nenhum usuário órfão encontrado"
else
  echo "⚠️  $orphan_users usuários sem empresa associada"
fi

echo ""

echo "📧 VERIFICAÇÃO DE EMAILS"
echo "------------------------"

# Contar clientes com email
clients_with_email=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM clients WHERE email IS NOT NULL AND email != '';" | tr -d ' ')
total_clients=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM clients;" | tr -d ' ')

if [ "$total_clients" -gt 0 ]; then
  percentage=$((clients_with_email * 100 / total_clients))
  echo "✅ $clients_with_email de $total_clients clientes têm email ($percentage%)"
else
  echo "ℹ️  Nenhum cliente cadastrado"
fi

echo ""

echo "🏷️  VERIFICAÇÃO DE TAGS"
echo "----------------------"

# Contar tags únicas
unique_tags=$($PSQL_CMD -t -c "SELECT COUNT(DISTINCT tag) FROM clients WHERE tag IS NOT NULL AND tag != '';" | tr -d ' ')

if [ "$unique_tags" -gt 0 ]; then
  echo "✅ $unique_tags tags únicas encontradas:"
  $PSQL_CMD -t -c "SELECT DISTINCT tag, COUNT(*) as count FROM clients WHERE tag IS NOT NULL AND tag != '' GROUP BY tag ORDER BY count DESC LIMIT 5;" | while read line; do
    echo "   - $line"
  done
else
  echo "ℹ️  Nenhuma tag cadastrada"
fi

echo ""

echo "📬 VERIFICAÇÃO DE CAMPANHAS"
echo "---------------------------"

# Campanhas por status
for status in draft sending completed failed; do
  count=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM email_campaigns WHERE status = '$status';" | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    echo "✅ $count campanha(s) no status: $status"
  fi
done

echo ""

echo "🔒 CONFIGURAÇÕES SMTP"
echo "---------------------"

smtp_count=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM smtp_configs WHERE \"isActive\" = true;" | tr -d ' ')

if [ "$smtp_count" -gt 0 ]; then
  echo "✅ $smtp_count configuração(ões) SMTP ativa(s)"
else
  echo "ℹ️  Nenhuma configuração SMTP ativa"
fi

echo ""
echo "=========================================="
echo "✅ TESTE DE INTEGRIDADE CONCLUÍDO"
echo "=========================================="
