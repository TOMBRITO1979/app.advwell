#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== Corrigindo role do Pedro para ADMIN ===\n"

# Atualizar Pedro para ADMIN
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"UPDATE users SET role = 'ADMIN' WHERE email = 'pedro@escritorio.com.br';\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Pedro atualizado para ADMIN ===\n"

# Verificar todos os usuários e seus roles
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"SELECT name, email, role, companies.name as company FROM users LEFT JOIN companies ON users.\\\"companyId\\\" = companies.id ORDER BY role, name;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Verificação completa ===\n"
