#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

puts "\n=== LOGS DO BACKEND (após deploy) ===\n"
spawn ssh -o StrictHostKeyChecking=no $host "docker service logs --tail 30 advtom_backend"
expect "password:"
send "$password\r"
expect eof

puts "\n=== FIM DOS LOGS ===\n"
