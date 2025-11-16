#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

# Verificar tabelas do banco
spawn ssh -o StrictHostKeyChecking=no $host "docker exec \$(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c '\\dt'"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Fim da verificação de tabelas ==="
