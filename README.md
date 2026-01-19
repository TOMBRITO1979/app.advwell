# AdvWell - Sistema Multitenant para Escritórios de Advocacia

Sistema SaaS completo para escritórios de advocacia brasileiros com integração ao DataJud CNJ.

## URLs de Produção

- **Frontend**: https://app.advwell.pro
- **Backend API**: https://api.advwell.pro

## Funcionalidades

- **Sistema Multitenant**: Suporte para múltiplas empresas isoladas
- **Autenticação JWT**: Login seguro com refresh tokens e recuperação de senha
- **Gestão de Clientes**: Cadastro e gerenciamento completo de clientes
- **Gestão de Processos**: Cadastro de processos com integração DataJud CNJ
- **Sincronização DataJud**: Graus G1, G2 e G3 com atualização automática
- **Sumarização por IA**: Integração com OpenAI GPT e Google Gemini
- **Campanhas de Email**: Templates personalizáveis com SMTP configurável
- **Contas a Pagar**: Gestão de contas com recorrência
- **Agenda**: Eventos com integração Google Meet
- **Prazos**: Acompanhamento com cores por urgência
- **Monitoramento OAB**: Publicações do Diário Oficial via ADVAPI
- **Gestão Financeira**: Receitas e despesas
- **Documentos**: Armazenamento S3 + links externos
- **Import/Export CSV**: Para clientes e processos
- **Níveis de Usuário**:
  - SUPER_ADMIN: Gerencia empresas, bypass de tenant
  - ADMIN: Gerencia sua empresa e usuários
  - USER: Acesso baseado em permissões

## Tecnologias

### Backend
- Node.js + Express + TypeScript
- PostgreSQL 16 + Prisma ORM
- JWT Authentication
- AWS S3 Integration
- Redis 7 (cache + filas)
- Node-Cron (tarefas agendadas)

### Frontend
- React 18 + TypeScript + Vite
- TailwindCSS
- Zustand (state management)
- React Router
- Axios

### Infraestrutura
- Docker Swarm (4 réplicas backend)
- Traefik (reverse proxy + SSL)
- PostgreSQL 16 (max_connections=500)
- Redis 7 (2GB cache)
- Prometheus + Alertmanager (monitoramento)

## Comandos de Desenvolvimento

### Backend

```bash
cd backend
npm install
npm run dev                    # Dev server
npm run build                  # Compilar TypeScript
npm run prisma:generate        # Gerar Prisma client
npm run prisma:migrate         # Executar migrations
npm test                       # Rodar testes
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # Vite dev server (porta 5173)
npm run build                  # Build de produção
```

## Deploy

### Build das Imagens

```bash
# Backend
cd backend
docker build -t tomautomations/advtom-backend:latest .

# Frontend (com URL da API)
cd frontend
docker build --build-arg VITE_API_URL=https://api.advwell.pro/api -t tomautomations/advtom-frontend:latest .
```

### Deploy na Stack

```bash
./deploy.sh                    # Exporta .env e faz deploy
docker stack ps advtom         # Verificar status
docker service logs advtom_backend -f   # Ver logs
```

## Variáveis de Ambiente

### Obrigatórias
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Secret JWT (min 32 chars)
- `ENCRYPTION_KEY` - Chave AES-256-CBC (64 hex chars)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - S3
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email
- `DATAJUD_API_KEY` - API DataJud CNJ
- `API_URL`, `FRONTEND_URL` - URLs dos serviços

### ADVAPI (Monitoramento OAB)
- `ADVAPI_BASE_URL` - URL da ADVAPI (https://api.advtom.com)
- `ADVAPI_API_KEY` - API Key para autenticação
- `ADVAPI_WEBHOOK_KEY` - Key para validar webhooks

### Segurança
- `HEALTH_CHECK_KEY` - Protege `/health/detailed`
- `REDIS_PASSWORD` - Autenticação Redis

## Estrutura do Projeto

```
app.advwell/
├── backend/              # API Node.js
│   ├── src/
│   │   ├── controllers/  # Controllers
│   │   ├── middleware/   # Middlewares (auth, tenant, csrf)
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Serviços (DataJud, AI, backup)
│   │   └── utils/        # Utilitários (prisma, redis, logger)
│   ├── prisma/           # Schema do banco
│   └── Dockerfile
├── frontend/             # React App
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   ├── services/     # API clients
│   │   └── contexts/     # Contextos (Auth)
│   └── Dockerfile
├── monitoring/           # Prometheus + Alertmanager
├── docker-compose.yml    # Stack Docker Swarm
├── deploy.sh             # Script de deploy
├── CLAUDE.md             # Guia para Claude Code
└── README.md             # Este arquivo
```

## Segurança

- Senhas com bcrypt (12 rounds)
- JWT + Refresh Tokens
- Rate limiting (200 req/15min global, 20 req/15min auth)
- CSRF protection (Double Submit Cookie)
- XSS sanitization
- Helmet.js security headers
- Isolamento multitenant (row-level)
- CORS configurado
- Health checks protegidos

## Backup

### Automático
- Backup diário às 03:00 para S3
- Retenção de 30 dias
- Formato JSON comprimido (.json.gz)

### Manual (SUPER_ADMIN)
```bash
# Criar backup
curl -X POST -H "Authorization: Bearer <token>" \
  https://api.advwell.pro/api/database-backup/test

# Listar backups
curl -H "Authorization: Bearer <token>" \
  https://api.advwell.pro/api/database-backup/list
```

## Monitoramento

- Prometheus: métricas de sistema
- Alertmanager: alertas configuráveis
- Grafana: dashboards
- Health checks: `/health` e `/health/detailed`

## Licença

Projeto comercial - Todos os direitos reservados.

---

**Sistema em produção para escritórios de advocacia brasileiros**
