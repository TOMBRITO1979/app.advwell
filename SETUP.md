# AdvWell - Guia de Instalação e Configuração

## 📋 Pré-requisitos

- Docker e Docker Swarm configurados
- Traefik rodando como reverse proxy
- Domínio configurado com DNS apontando para o servidor
- Conta AWS com S3 bucket criado
- Conta Gmail com senha de aplicativo (para SMTP)
- Acesso à API do DataJud CNJ

## 🔧 Configuração Inicial

### 1. Clonar o Repositório

```bash
git clone https://github.com/TOMBRITO1979/drwell.git
cd drwell
```

### 2. Configurar Credenciais

Copie o arquivo de exemplo e configure com suas credenciais:

```bash
cp docker-compose.example.yml docker-compose.yml
```

Edite `docker-compose.yml` e substitua os seguintes valores:

#### PostgreSQL Database
```yaml
- POSTGRES_PASSWORD=YOUR_SECURE_POSTGRES_PASSWORD_HERE
```
**Gere uma senha segura:** Use um gerador de senhas aleatórias de pelo menos 32 caracteres.

#### Database URL
```yaml
- DATABASE_URL=postgresql://postgres:YOUR_SECURE_POSTGRES_PASSWORD_HERE@postgres:5432/advtom
```
**Importante:** Use a mesma senha do PostgreSQL.

#### JWT Secret
```yaml
- JWT_SECRET=YOUR_SECURE_JWT_SECRET_HERE_CHANGE_IN_PRODUCTION
```
**Gere uma chave segura:** Pelo menos 64 caracteres aleatórios.

#### AWS S3
```yaml
- AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE
- AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY_HERE
- S3_BUCKET_NAME=YOUR_S3_BUCKET_NAME_HERE
```

**Como obter:**
1. Acesse AWS Console → IAM → Users
2. Crie um novo usuário com acesso programático
3. Anexe a policy `AmazonS3FullAccess`
4. Salve as credenciais (Access Key ID e Secret Access Key)
5. Crie um bucket no S3 e anote o nome

#### SMTP (Gmail)
```yaml
- SMTP_USER=YOUR_SMTP_USER_HERE
- SMTP_PASSWORD=YOUR_SMTP_APP_PASSWORD_HERE
- SMTP_FROM=AdvWell <YOUR_SMTP_USER_HERE>
```

**Como obter senha de aplicativo do Gmail:**
1. Acesse [myaccount.google.com](https://myaccount.google.com)
2. Segurança → Verificação em duas etapas (ative se não estiver)
3. Senhas de app → Gerar nova senha
4. Use a senha gerada (16 caracteres sem espaços)

#### URLs do Sistema
```yaml
- API_URL=https://api.your-domain.com
- FRONTEND_URL=https://app.your-domain.com
```
**Substitua** `your-domain.com` pelo seu domínio real.

#### DataJud CNJ API
```yaml
- DATAJUD_API_KEY=YOUR_DATAJUD_API_KEY_HERE
```
**Como obter:** Solicite acesso à API do DataJud através do portal do CNJ.

### 3. Atualizar Traefik Labels

Edite as regras do Traefik em `docker-compose.yml`:

```yaml
# Backend
- "traefik.http.routers.advwell-backend.rule=Host(`api.your-domain.com`)"

# Frontend
- "traefik.http.routers.advwell-frontend.rule=Host(`app.your-domain.com`)"
```

### 4. Rebuild Frontend (se mudou o domínio)

Se você alterou as URLs, precisa reconstruir o frontend com a nova API URL:

```bash
docker build --build-arg VITE_API_URL=https://api.your-domain.com/api \
  -t tomautomations/advwell-frontend:custom frontend/
```

Depois atualize a imagem no `docker-compose.yml`:
```yaml
frontend:
  image: tomautomations/advwell-frontend:custom
```

## 🚀 Deploy

### Deploy no Docker Swarm

```bash
docker stack deploy -c docker-compose.yml advtom
```

### Verificar Status

```bash
docker stack ps advtom
docker service logs advtom_backend -f
docker service logs advtom_frontend -f
```

### Acessar o Sistema

- Frontend: https://app.your-domain.com
- Backend API: https://api.your-domain.com
- Health Check: https://api.your-domain.com/health

## 🔒 Segurança

### ⚠️ IMPORTANTE

1. **NUNCA** commite o arquivo `docker-compose.yml` para o git
2. O arquivo `docker-compose.yml` está em `.gitignore` por segurança
3. Apenas o `docker-compose.example.yml` (sem credenciais) deve ser versionado
4. Mantenha backups seguros das credenciais em um gerenciador de senhas
5. Rotacione as senhas periodicamente

### Verificar Configuração de Segurança

```bash
# Verificar se docker-compose.yml NÃO está versionado
git ls-files | grep docker-compose.yml
# Não deve retornar nada

# Verificar se está em .gitignore
cat .gitignore | grep docker-compose.yml
# Deve mostrar a linha
```

## 📦 Backup

### Criar Backup Completo

```bash
./criar_backup.sh
```

Backups são salvos em `/root/advtom/backups/`

### Restaurar Backup

```bash
/root/advtom/backups/NOME_DO_BACKUP/restore.sh
```

## 🔄 Atualizações

### Atualizar para Nova Versão

```bash
# Pull das novas imagens
docker pull tomautomations/advwell-backend:vNOVA_VERSAO
docker pull tomautomations/advwell-frontend:vNOVA_VERSAO

# Atualizar docker-compose.yml com as novas versões
# Editar manualmente ou usar sed:
sed -i 's/v40-pdf-fix-real/vNOVA_VERSAO/g' docker-compose.yml

# Criar backup antes de atualizar
./criar_backup.sh

# Deploy da atualização
docker stack deploy -c docker-compose.yml advtom
```

## 🆘 Troubleshooting

### Serviço não inicia

```bash
# Verificar logs
docker service logs advtom_backend --tail 100

# Verificar status
docker service ps advtom_backend
```

### Erro de conexão com banco de dados

- Verifique se a senha do PostgreSQL está correta em ambos os lugares:
  - `POSTGRES_PASSWORD`
  - `DATABASE_URL`

### Frontend não consegue acessar backend

- Verifique se o `VITE_API_URL` foi configurado corretamente no build
- Verifique se o Traefik está roteando corretamente
- Teste o backend diretamente: `curl https://api.your-domain.com/health`

### Certificado SSL não funciona

- Verifique se o DNS está configurado corretamente
- Aguarde alguns minutos para o Let's Encrypt emitir o certificado
- Verifique logs do Traefik: `docker service logs traefik_traefik -f`

## 📞 Suporte

- Documentação completa: Ver `CLAUDE.md`
- Issues: https://github.com/TOMBRITO1979/drwell/issues

## 📝 Licença

Proprietary - Todos os direitos reservados
