#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

# Verificar logs do frontend
spawn ssh -o StrictHostKeyChecking=no $host "docker service logs --tail 30 advtom_frontend"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Fim dos logs do frontend ==="
