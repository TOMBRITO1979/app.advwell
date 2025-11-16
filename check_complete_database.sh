#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== VERIFICAÇÃO COMPLETA DO BANCO DE DADOS ===\n"

puts "=== 1. TODAS AS TABELAS ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c '\\dt'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 2. COMPANIES (todas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT * FROM companies;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 3. USERS (todos) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, name, email, password, role, active, \"companyId\" FROM users;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 4. CLIENTS (todos) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, name, email, cpf, phone, \"companyId\", active FROM clients;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 5. CASES (todos) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, \"processNumber\", court, subject, value, status, \"clientId\", \"companyId\" FROM cases;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 6. PERMISSIONS (todas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT * FROM permissions;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 7. SYSTEM_CONFIG (todas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT * FROM system_config;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 8. CASE_MOVEMENTS (contagem) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT COUNT(*) as total FROM case_movements;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== 9. MIGRAÇÕES APLICADAS ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT * FROM _prisma_migrations;'"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== FIM DA VERIFICAÇÃO ===\n"
