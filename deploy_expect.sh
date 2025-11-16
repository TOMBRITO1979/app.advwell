#!/usr/bin/expect -f

set timeout -1
set password "Contadeva123@"
set host "root@72.60.123.185"

# Copiar docker-compose.yml
spawn scp -o StrictHostKeyChecking=no /root/advtom/docker-compose.yml $host:/root/advtom-stack.yml
expect "password:"
send "$password\r"
expect eof

# Verificar/criar rede
spawn ssh -o StrictHostKeyChecking=no $host "docker network ls | grep network_public || docker network create --driver overlay network_public"
expect "password:"
send "$password\r"
expect eof

# Remover stack antiga
spawn ssh -o StrictHostKeyChecking=no $host "docker stack rm advtom"
expect "password:"
send "$password\r"
expect eof

# Aguardar
sleep 10

# Deploy nova stack
spawn ssh -o StrictHostKeyChecking=no $host "docker stack deploy -c /root/advtom-stack.yml advtom"
expect "password:"
send "$password\r"
expect eof

# Verificar status
spawn ssh -o StrictHostKeyChecking=no $host "docker stack ps advtom"
expect "password:"
send "$password\r"
expect eof

puts "\n=== Deploy concluído! ==="
puts "Frontend: https://app.advtom.com"
puts "Backend API: https://api.advtom.com"
