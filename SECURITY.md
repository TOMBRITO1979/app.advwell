# Segurança e Gestão de Credenciais - AdvWell

## 🔒 Proteção de Credenciais

Este projeto utiliza múltiplas camadas de proteção para garantir que credenciais sensíveis não sejam expostas:

### 1. Arquivos Protegidos

Os seguintes arquivos contêm credenciais e **NUNCA** devem ser commitados no Git:

- ✅ `.env` - Variáveis de ambiente de produção (IGNORADO pelo Git)
- ✅ `docker-compose.prod.yml` - Docker Compose com credenciais reais (IGNORADO pelo Git)
- ✅ `backend/.env` - Variáveis do backend (IGNORADO pelo Git)
- ✅ `frontend/.env` - Variáveis do frontend (IGNORADO pelo Git)

### 2. Arquivos Seguros no GitHub

Estes arquivos estão no repositório e usam **placeholders seguros**:

- ✅ `docker-compose.yml` - Usa variáveis de ambiente: `${VAR:-default}`
- ✅ `.env.example` - Template sem credenciais reais
- ✅ `backend/.env.example` - Template do backend
- ✅ `frontend/.env.example` - Template do frontend

### 3. Proteção do GitHub

O repositório tem **GitHub Secret Scanning** ativo, que bloqueia automaticamente pushes contendo:

- ❌ AWS Access Keys
- ❌ AWS Secret Keys
- ❌ Senhas em texto plano
- ❌ Tokens de API
- ❌ Chaves privadas

**Exemplo de bloqueio:**
```
remote: error: GH013: Repository rule violations found
remote: - GITHUB PUSH PROTECTION
remote:   - Push cannot contain secrets
```

## 🔐 Credenciais Atuais

### PostgreSQL
- **Senha:** Armazenada em `.env` como `POSTGRES_PASSWORD`
- **Uso:** Banco de dados principal

### JWT Secret
- **Chave:** Armazenada em `.env` como `JWT_SECRET`
- **Uso:** Autenticação de tokens

### AWS S3
- **Access Key:** Armazenada em `.env` como `AWS_ACCESS_KEY_ID`
- **Secret Key:** Armazenada em `.env` como `AWS_SECRET_ACCESS_KEY`
- **Uso:** Armazenamento de documentos

### SMTP (Gmail)
- **Email:** `appadvwell@gmail.com`
- **App Password:** Armazenada em `.env` como `SMTP_PASSWORD`
- **Uso:** Envio de emails (recuperação de senha, boas-vindas)

### DataJud CNJ API
- **API Key:** Armazenada em `.env` como `DATAJUD_API_KEY`
- **Uso:** Integração com sistema judicial brasileiro

## 📋 Configuração Inicial

### Para Desenvolvimento Local:

1. Copie o template de variáveis:
   ```bash
   cp .env.example .env
   ```

2. Edite `.env` e preencha com suas credenciais

3. Nunca commite o arquivo `.env`:
   ```bash
   git status  # Verifique que .env não aparece
   ```

### Para Deploy em Produção:

1. **Opção A: Usar arquivo .env (recomendado para Docker Swarm)**
   ```bash
   # Crie .env na raiz do projeto
   vim .env

   # Deploy
   docker stack deploy -c docker-compose.yml advtom
   ```
   O Docker Compose automaticamente carrega o `.env` da raiz.

2. **Opção B: Variáveis de ambiente do sistema**
   ```bash
   export POSTGRES_PASSWORD="sua_senha_aqui"
   export JWT_SECRET="seu_jwt_secret_aqui"
   # ... outras variáveis

   docker stack deploy -c docker-compose.yml advtom
   ```

3. **Opção C: Docker Compose com credenciais inline (NÃO RECOMENDADO)**
   ```bash
   # Use docker-compose.prod.yml (não commitado)
   docker stack deploy -c docker-compose.prod.yml advtom
   ```

## 🛡️ Boas Práticas

### ✅ FAÇA:

1. **Use o arquivo `.env` para armazenar credenciais localmente**
2. **Verifique o `.gitignore` antes de commitar:**
   ```bash
   git check-ignore .env  # Deve retornar ".env"
   ```
3. **Use senhas fortes e únicas para cada serviço**
4. **Rotacione credenciais regularmente**
5. **Use variáveis de ambiente em `docker-compose.yml`:**
   ```yaml
   - PASSWORD=${PASSWORD:-default_value}
   ```

### ❌ NÃO FAÇA:

1. **NÃO commite arquivos com credenciais reais**
2. **NÃO compartilhe arquivos `.env` por email/chat**
3. **NÃO use senhas fracas ou padrão**
4. **NÃO desabilite o GitHub Secret Scanning**
5. **NÃO force push (`--no-verify`) para bypassar proteções**

## 🔍 Verificação de Segurança

### Verificar se há senhas no histórico:

```bash
# Procurar por padrões de senha
git log --all -p | grep -i "password\|secret\|key" | grep -v "placeholder\|example"

# Procurar por credenciais específicas (substitua XXX pela credencial)
git log --all -p -S "CREDENCIAL_AQUI"
```

### Verificar arquivos ignorados:

```bash
git status --ignored
```

### Verificar o que será commitado:

```bash
git diff --cached  # Ver mudanças staged
```

## 🚨 O que fazer se credenciais foram expostas

Se você acidentalmente commitou credenciais:

1. **IMEDIATO: Rotacione todas as credenciais expostas**
   - AWS: Desative e crie novas keys
   - SMTP: Gere nova senha de app
   - Database: Mude a senha
   - JWT: Gere novo secret

2. **Limpe o histórico do Git:**
   ```bash
   # Usando git-filter-repo (recomendado)
   git filter-repo --path docker-compose.yml --invert-paths

   # Ou usando BFG Repo-Cleaner
   bfg --delete-files docker-compose.yml

   # Force push
   git push origin --force --all
   ```

3. **Notifique o GitHub:**
   - O GitHub pode já ter detectado via Secret Scanning
   - Verifique: Settings > Security > Secret Scanning alerts

## 📞 Suporte

Para questões de segurança, consulte:
- Documentação: `/root/advtom/CLAUDE.md`
- GitHub Repo: https://github.com/TOMBRITO1979/drwell

---

**Última atualização:** 03/11/2025
**Responsável:** Sistema AdvWell Security Team
