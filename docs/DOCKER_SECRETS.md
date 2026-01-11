# Docker Secrets - AdvWell

Este documento descreve como usar Docker Secrets para gerenciar credenciais sensíveis de forma segura.

## Visão Geral

Docker Secrets permite armazenar dados sensíveis (senhas, chaves de API, etc.) de forma criptografada no Docker Swarm, ao invés de passá-los como variáveis de ambiente no docker-compose.yml.

## Vantagens

- **Criptografia em repouso**: Secrets são armazenados criptografados no Raft log do Swarm
- **Criptografia em trânsito**: Secrets são transmitidos via TLS mutual
- **Acesso controlado**: Apenas containers autorizados têm acesso aos secrets
- **Sem exposição em logs**: Secrets não aparecem em `docker inspect` ou logs
- **Rotação segura**: Secrets podem ser rotacionados sem rebuild de imagens

## Secrets Suportados

| Secret Name | Env Var | Descrição |
|-------------|---------|-----------|
| `postgres_password` | `POSTGRES_PASSWORD` | Senha do PostgreSQL |
| `redis_password` | `REDIS_PASSWORD` | Senha do Redis |
| `jwt_secret` | `JWT_SECRET` | Secret para JWT (min 32 chars) |
| `encryption_key` | `ENCRYPTION_KEY` | Chave AES-256 (64 hex chars) |
| `aws_secret_access_key` | `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `smtp_password` | `SMTP_PASSWORD` | Senha SMTP |
| `datajud_api_key` | `DATAJUD_API_KEY` | API Key do CNJ DataJud |
| `advapi_api_key` | `ADVAPI_API_KEY` | API Key da ADVAPI |
| `advapi_webhook_key` | `ADVAPI_WEBHOOK_KEY` | Webhook Key da ADVAPI |
| `stripe_secret_key` | `STRIPE_SECRET_KEY` | Stripe Secret Key |
| `stripe_webhook_secret` | `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret |
| `health_check_key` | `HEALTH_CHECK_KEY` | Chave de proteção do health check |

## Como Criar Secrets

### Opção 1: A partir de arquivo

```bash
# Criar arquivo temporário com a senha
echo "minha_senha_super_secreta" > /tmp/secret.txt

# Criar o secret
docker secret create postgres_password /tmp/secret.txt

# Remover arquivo temporário
rm /tmp/secret.txt
```

### Opção 2: Diretamente via pipe

```bash
echo "minha_senha_super_secreta" | docker secret create postgres_password -
```

### Opção 3: Script de criação em lote

```bash
#!/bin/bash
# create-secrets.sh

# Carrega variáveis do .env
source /root/advwell/.env

# Cria secrets a partir das variáveis de ambiente
echo "$POSTGRES_PASSWORD" | docker secret create postgres_password -
echo "$REDIS_PASSWORD" | docker secret create redis_password -
echo "$JWT_SECRET" | docker secret create jwt_secret -
echo "$ENCRYPTION_KEY" | docker secret create encryption_key -
echo "$AWS_SECRET_ACCESS_KEY" | docker secret create aws_secret_access_key -
echo "$SMTP_PASSWORD" | docker secret create smtp_password -
echo "$DATAJUD_API_KEY" | docker secret create datajud_api_key -
echo "$ADVAPI_API_KEY" | docker secret create advapi_api_key -
echo "$ADVAPI_WEBHOOK_KEY" | docker secret create advapi_webhook_key -
echo "$STRIPE_SECRET_KEY" | docker secret create stripe_secret_key -
echo "$STRIPE_WEBHOOK_SECRET" | docker secret create stripe_webhook_secret -
echo "$HEALTH_CHECK_KEY" | docker secret create health_check_key -

echo "Secrets criados com sucesso!"
docker secret ls
```

## Verificar Secrets Existentes

```bash
# Listar todos os secrets
docker secret ls

# Inspecionar um secret (não mostra o conteúdo, apenas metadados)
docker secret inspect postgres_password
```

## Rotação de Secrets

```bash
# 1. Criar novo secret com versão
echo "nova_senha" | docker secret create postgres_password_v2 -

# 2. Atualizar docker-compose.yml para usar postgres_password_v2

# 3. Redesplojar serviços
docker stack deploy -c docker-compose.yml advtom

# 4. Remover secret antigo (depois de confirmar que tudo funciona)
docker secret rm postgres_password
```

## Como Funciona no AdvWell

O backend usa um script de entrypoint (`docker-entrypoint.sh`) que:

1. Verifica se existem arquivos em `/run/secrets/`
2. Se existirem, carrega o conteúdo como variáveis de ambiente
3. Se não existirem, usa as variáveis de ambiente normais (retrocompatível)

Isso permite migração gradual - você pode começar a usar secrets sem precisar migrar tudo de uma vez.

## Ativando Secrets no docker-compose.yml

Adicione a seção de secrets ao docker-compose.yml:

```yaml
# No topo do arquivo, defina os secrets disponíveis
secrets:
  postgres_password:
    external: true
  redis_password:
    external: true
  jwt_secret:
    external: true
  encryption_key:
    external: true
  # ... outros secrets

# Em cada serviço, adicione os secrets que ele precisa
services:
  backend:
    secrets:
      - postgres_password
      - redis_password
      - jwt_secret
      - encryption_key
      - aws_secret_access_key
      - smtp_password
      - datajud_api_key
      - advapi_api_key
      - advapi_webhook_key
      - stripe_secret_key
      - stripe_webhook_secret
      - health_check_key
```

## Troubleshooting

### Secret não está sendo carregado

1. Verifique se o secret existe: `docker secret ls`
2. Verifique se o serviço tem acesso ao secret no docker-compose.yml
3. Verifique os logs do container: `docker service logs advtom_backend`

### Erro "secret not found"

```bash
# O secret precisa ser criado ANTES do deploy
docker secret create nome_do_secret -
docker stack deploy -c docker-compose.yml advtom
```

### Como ver o valor de um secret (debug)

```bash
# Entre no container
docker exec -it <container_id> sh

# Leia o arquivo do secret
cat /run/secrets/nome_do_secret
```

## Migração do .env para Secrets

1. Execute o script `create-secrets.sh` para criar todos os secrets
2. Atualize o docker-compose.yml para incluir a seção `secrets`
3. Redesplogue: `./deploy.sh`
4. Teste se tudo funciona
5. Remova as senhas do arquivo .env (opcional - mantém como fallback)

## Referências

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Manage sensitive data with Docker secrets](https://docs.docker.com/compose/use-secrets/)
