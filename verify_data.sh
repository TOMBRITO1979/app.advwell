#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== Verificando dados existentes ===\n"

# Verificar companies
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, name, cnpj FROM companies;'"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Companies verificadas ===\n"

# Verificar users
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT id, name, email, role FROM users;'"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Users verificados ===\n"

# Verificar clients
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT COUNT(*) FROM clients;'"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Clients verificados ===\n"

# Verificar cases
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c 'SELECT COUNT(*) FROM cases;'"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Cases verificados ===\n"
