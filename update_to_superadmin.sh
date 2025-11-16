#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== Atualizando usuários para SUPER_ADMIN ===\n"

# Atualizar carlos para SUPER_ADMIN
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'carlos@superadmin.com';\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Carlos atualizado para SUPER_ADMIN ===\n"

# Atualizar maria para SUPER_ADMIN
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'maria@superadmin.com';\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Maria atualizada para SUPER_ADMIN ===\n"

# Verificar os usuários SUPER_ADMIN
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"SELECT id, name, email, role FROM users WHERE role = 'SUPER_ADMIN';\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Verificação completa ===\n"
