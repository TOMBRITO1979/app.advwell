#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== Inserindo dados nas tabelas restantes ===\n"

# Buscar IDs dos usuários para criar permissões
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"SELECT id, name FROM users WHERE role = 'USER' LIMIT 2;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Criando permissões para usuários ===\n"

# Inserir permissões (vamos usar IDs fixos que pegamos da consulta)
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"INSERT INTO permissions (id, \\\"userId\\\", resource, \\\"canView\\\", \\\"canEdit\\\", \\\"canDelete\\\", \\\"createdAt\\\", \\\"updatedAt\\\") SELECT gen_random_uuid(), u.id, 'clients', true, true, false, NOW(), NOW() FROM users u WHERE u.role = 'USER' ON CONFLICT DO NOTHING;\""
expect "password:"
send "$password\r"
expect eof

spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"INSERT INTO permissions (id, \\\"userId\\\", resource, \\\"canView\\\", \\\"canEdit\\\", \\\"canDelete\\\", \\\"createdAt\\\", \\\"updatedAt\\\") SELECT gen_random_uuid(), u.id, 'cases', true, false, false, NOW(), NOW() FROM users u WHERE u.role = 'USER' ON CONFLICT DO NOTHING;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Permissões criadas ===\n"

# Inserir configurações do sistema
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"INSERT INTO system_config (id, key, value, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES (gen_random_uuid(), 'app_name', 'AdvTom', NOW(), NOW()), (gen_random_uuid(), 'app_version', '1.0.0', NOW(), NOW()), (gen_random_uuid(), 'maintenance_mode', 'false', NOW(), NOW()) ON CONFLICT DO NOTHING;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Configurações do sistema criadas ===\n"

# Verificar todas as tabelas
puts "\n=== VERIFICANDO TODAS AS TABELAS ===\n"

spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c \"SELECT 'companies' as table_name, COUNT(*) FROM companies UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'clients', COUNT(*) FROM clients UNION ALL SELECT 'cases', COUNT(*) FROM cases UNION ALL SELECT 'permissions', COUNT(*) FROM permissions UNION ALL SELECT 'system_config', COUNT(*) FROM system_config UNION ALL SELECT 'case_movements', COUNT(*) FROM case_movements UNION ALL SELECT 'case_documents', COUNT(*) FROM case_documents;\""
expect "password:"
send "$password\r"
expect eof

puts "\n=== Verificação completa ===\n"
