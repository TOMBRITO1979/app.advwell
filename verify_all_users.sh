#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== Verificando todos os usuários ===\n"

# Verificar todos os usuários e seus roles
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"SELECT users.name, users.email, users.role, companies.name as company FROM users LEFT JOIN companies ON users.\\\"companyId\\\" = companies.id ORDER BY users.role, users.name;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Verificação completa ===\n"
