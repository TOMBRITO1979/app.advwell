#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== LOGS DO POSTGRES (últimas 50 linhas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker service logs --tail 50 advtom_postgres"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== LOGS DO BACKEND (últimas 50 linhas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker service logs --tail 50 advtom_backend"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== LOGS DO FRONTEND (últimas 50 linhas) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker service logs --tail 50 advtom_frontend"
expect "password:"
send "$password\r"
expect eof

puts "\n\n=== FIM DOS LOGS ===\n"
