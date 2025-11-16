#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

# Verificar status dos serviços
spawn ssh -o StrictHostKeyChecking=no $host "docker stack ps advtom"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Fim da verificação ==="
