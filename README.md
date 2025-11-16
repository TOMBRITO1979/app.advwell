# AdvTom - Sistema Multitenant para Escritório de Advocacia

Sistema SaaS completo para escritórios de advocacia com integração ao DataJud CNJ.

## URLs de Teste

- **Frontend**: https://app.advtom.com
- **Backend API**: https://api.advtom.com

**IMPORTANTE**: Estas são URLs de teste. Para distribuir o sistema para outras pessoas, você precisará alterar as URLs no `docker-compose.yml` e fazer rebuild das imagens com as novas URLs.

## Funcionalidades

- **Sistema Multitenant**: Suporte para múltiplas empresas isoladas
- **Autenticação JWT**: Login seguro com recuperação de senha via SMTP
- **Gestão de Clientes**: Cadastro e gerenciamento completo de clientes
- **Gestão de Processos**: Cadastro de processos com integração DataJud CNJ
- **Sincronização Automática**: Atualização diária automática dos processos
- **Níveis de Usuário**:
  - Super Admin: Gerencia empresas
  - Admin: Gerencia sua empresa e usuários
  - User: Acessa recursos conforme permissões
- **Upload de Documentos**: Armazenamento seguro no AWS S3
- **Notificações por Email**: Sistema SMTP configurável

## Tecnologias

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- AWS S3 Integration
- Nodemailer (SMTP)
- Node-Cron (tarefas agendadas)

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand (state management)
- React Router
- Axios

### Infraestrutura
- Docker + Docker Swarm
- Traefik (reverse proxy + SSL)
- PostgreSQL 16
- Nginx (frontend)

## Como Mudar as URLs para Distribuição

### 1. Editar docker-compose.yml

Abra o arquivo `/root/advtom/docker-compose.yml` e altere:

```yaml
# Altere estas linhas no serviço backend:
- API_URL=https://SEU_DOMINIO_API
- FRONTEND_URL=https://SEU_DOMINIO_FRONTEND

# E estas labels do Traefik:
- "traefik.http.routers.advtom-backend.rule=Host(`SEU_DOMINIO_API`)"

# No serviço frontend:
- VITE_API_URL=https://SEU_DOMINIO_API/api

# E esta label do Traefik:
- "traefik.http.routers.advtom-frontend.rule=Host(`SEU_DOMINIO_FRONTEND`)"
```

### 2. Rebuild da imagem do frontend

O frontend precisa ser rebuilded com a nova URL da API:

```bash
cd /root/advtom/frontend
docker build --no-cache --build-arg VITE_API_URL=https://SEU_DOMINIO_API/api -t tomautomations/advtom-frontend:latest .
```

### 3. Push das imagens (opcional)

Se você quiser usar suas próprias imagens:

```bash
# Login no Docker Hub
docker login -u SEU_USUARIO

# Tag e push
docker tag tomautomations/advtom-backend:latest SEU_USUARIO/advtom-backend:latest
docker push SEU_USUARIO/advtom-backend:latest

docker tag tomautomations/advtom-frontend:latest SEU_USUARIO/advtom-frontend:latest
docker push SEU_USUARIO/advtom-frontend:latest
```

### 4. Deploy

```bash
# Atualizar o script de deploy
vim /root/advtom/deploy_expect.sh
# Alterar o host para seu servidor

# Executar deploy
/root/advtom/deploy_expect.sh
```

## Deploy

### Pré-requisitos

- Docker Swarm inicializado
- Rede `network_public` criada
- Traefik configurado na rede `network_public`
- DNS configurado apontando para o servidor

### Deploy Automatizado

```bash
# O script já está configurado
/root/advtom/deploy_expect.sh
```

### Deploy Manual

```bash
# 1. Copiar docker-compose.yml para o servidor
scp docker-compose.yml root@SEU_SERVIDOR:/root/advtom-stack.yml

# 2. Conectar ao servidor
ssh root@SEU_SERVIDOR

# 3. Deploy da stack
docker stack deploy -c /root/advtom-stack.yml advtom

# 4. Verificar status
docker stack ps advtom
```

### Verificar Logs

```bash
docker service logs advtom_backend -f
docker service logs advtom_frontend -f
docker service logs advtom_postgres -f
```

## Configuração

### Variáveis de Ambiente (docker-compose.yml)

#### Database
- `POSTGRES_PASSWORD`: Senha do PostgreSQL

#### AWS S3
- `AWS_ACCESS_KEY_ID`: Chave de acesso AWS
- `AWS_SECRET_ACCESS_KEY`: Chave secreta AWS
- `AWS_REGION`: Região AWS
- `S3_BUCKET_NAME`: Nome do bucket

#### SMTP
- `SMTP_HOST`: Servidor SMTP (ex: smtp.gmail.com)
- `SMTP_PORT`: Porta SMTP (ex: 587)
- `SMTP_USER`: Usuário SMTP
- `SMTP_PASSWORD`: Senha SMTP ou App Password
- `SMTP_FROM`: Remetente dos emails

#### DataJud CNJ
- `DATAJUD_API_KEY`: Chave da API DataJud

#### URLs
- `API_URL`: URL completa da API
- `FRONTEND_URL`: URL completa do frontend
- `VITE_API_URL`: URL completa da API + /api

## Desenvolvimento Local

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com suas configurações
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edite o .env com a URL da API
npm run dev
```

## Acesso ao Sistema

### Primeiro Acesso

1. Acesse https://app.advtom.com/register (ou sua URL)
2. Crie sua conta (será criado como Admin da empresa)
3. Faça login e comece a usar

### Super Admin

Para criar um Super Admin, conecte ao container e use o Prisma Studio:

```bash
docker exec -it $(docker ps -q -f name=advtom_backend) sh
npx prisma studio
```

## API DataJud CNJ

A integração com o DataJud permite:

- Busca automática de processos por número
- Sincronização de movimentações
- Atualização diária automática às 2h da manhã
- Busca manual via botão "Sincronizar"

### Tribunais Suportados

- TJRJ, TJSP, TJMG
- TRF1, TRF2, TRF3, TRF4, TRF5

## Segurança

- Senhas criptografadas com bcrypt
- JWT para autenticação
- Rate limiting nas APIs
- Helmet.js para headers de segurança
- Isolamento multitenant no banco de dados
- CORS configurado

## Atualizar o Sistema

```bash
# Local - fazer rebuild e push
cd /root/advtom/frontend
docker build --no-cache --build-arg VITE_API_URL=https://api.advtom.com/api -t tomautomations/advtom-frontend:latest .
docker push tomautomations/advtom-frontend:latest

# No servidor
/root/advtom/deploy_expect.sh
```

## Backup

```bash
# Conectar ao servidor
ssh root@72.60.123.185

# Fazer backup
docker exec $(docker ps -q -f name=advtom_postgres) pg_dump -U postgres advtom > backup_advtom_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_advtom_20241030.sql | docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres advtom
```

## Estrutura do Projeto

```
advtom/
├── backend/              # API Node.js
│   ├── src/
│   │   ├── controllers/  # Controllers
│   │   ├── middleware/   # Middlewares
│   │   ├── models/       # (Prisma gera os models)
│   │   ├── routes/       # Rotas
│   │   ├── services/     # Serviços (DataJud, etc)
│   │   ├── config/       # Configurações
│   │   └── utils/        # Utilitários
│   ├── prisma/           # Schema do Prisma
│   └── Dockerfile
├── frontend/             # React App
│   ├── src/
│   │   ├── components/   # Componentes
│   │   ├── pages/        # Páginas
│   │   ├── services/     # API clients
│   │   ├── contexts/     # Contextos (Auth)
│   │   └── styles/       # Estilos
│   └── Dockerfile
├── docker-compose.yml    # Stack do Docker Swarm
├── deploy_expect.sh      # Script de deploy
├── README.md             # Este arquivo
└── ACESSO.md            # Informações de acesso
```

## Suporte

Para suporte ou dúvidas, consulte a documentação completa no ACESSO.md.

## Licença

Este projeto foi desenvolvido para fins comerciais.

---

**Sistema desenvolvido e pronto para distribuição! 🚀**
