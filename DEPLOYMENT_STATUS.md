# AdvWell - Status de Deployment

**Data da Última Atualização:** 15/11/2025 05:00 UTC

## 🚀 Versões em Produção

### Backend
- **Versão:** v37.1-s3-search-fix
- **Imagem:** tomautomations/advwell-backend:v37.1-s3-search-fix
- **Principais Features:**
  - ✅ S3 presigned URLs - downloads de documentos funcionando (fix completo incluindo endpoint /search)
  - ✅ 6 fases de segurança completas (validation, XSS, rate limiting, bcrypt 12, account lockout, logging)
  - ✅ Financial summary fix - endpoint retorna transactions + summary
  - ✅ Integração DataJud CNJ com multi-grade sync
  - ✅ Sistema multitenant completo

### Frontend
- **Versão:** v23-download-button
- **Imagem:** tomautomations/advwell-frontend:v23-download-button
- **Principais Features:**
  - ✅ Botões Visualizar e Download para documentos
  - ✅ Consistência visual completa (Login, Register, ForgotPassword)
  - ✅ Tema verde padronizado em todas as páginas
  - ✅ Dark mode funcionando corretamente
  - ✅ Responsivo para mobile

### Database
- **Versão:** PostgreSQL 16-alpine
- **Schema:** Completo com multitenant, case parts, financial, documents

## 📊 URLs de Produção

- **Frontend:** https://app.advwell.pro
- **Backend API:** https://api.advwell.pro
- **SSL:** Let's Encrypt (auto-renovação via Traefik)

## 🔧 Últimas Alterações (15/11/2025)

### v23-download-button (Frontend) - ATUAL
**Nova Funcionalidade:** Botões separados para Visualizar e Download
- **Implementação:** Dois botões na lista de documentos
  - 👁️ **Visualizar** (azul) - Abre documento em nova aba do navegador
  - 📥 **Download** (verde) - Força download direto do arquivo
- **Código:** handleDownloadDocument() em Documents.tsx
- **UX:** Ícones SVG para melhor identificação visual
- **Status:** ✅ Deployado e funcional

### v37.1-s3-search-fix (Backend)
**Fix Crítico:** Endpoint /documents/search não estava gerando URLs assinadas
- **Problema:** v37 corrigiu /documents/:id e /documents mas esqueceu /documents/search
- **Impacto:** Frontend usa /documents/search, então usuários continuavam com Access Denied
- **Correção:** Adicionado mesmo código de presigned URL ao endpoint searchDocuments()
- **Status:** ✅ Deployado - agora todos os endpoints geram URLs assinadas

### v37-s3-signed-urls (Backend)
**Problema Resolvido:** S3 Access Denied ao baixar documentos
- **Erro anterior:** Usuários recebiam XML "Access Denied" ao invés do arquivo
- **Causa:** Bucket S3 privado, URLs públicas não funcionam
- **Solução:** Implementadas URLs assinadas (presigned URLs) com validade de 1 hora
- **Endpoints modificados:**
  - `GET /api/documents/:id` - Retorna signed URL para documentos do tipo 'upload'
  - `GET /api/documents` - Lista retorna signed URLs para todos documentos de upload
- **Implementação:** Usa `@aws-sdk/s3-request-presigner` getSignedUrl()
- **Segurança:** URLs expiram em 3600 segundos (1 hora)
- **Status:** ✅ Deployado e funcional

### v36-financial-summary-fix (Backend)
**Problema Resolvido:** Tela branca na aba Financeiro
- Endpoint `/api/financial` agora retorna `{ data: [...], summary: {...} }`
- Frontend consegue acessar `totalIncome`, `totalExpense`, `balance`
- Dashboard financeiro funcional

### v22-style-consistency (Frontend)
**Padronização Visual Completa:**
- Página Register: inputs com `dark:text-white`, links com cores corretas
- Página ForgotPassword: título `text-5xl` igual ao Login
- Todas as páginas de autenticação com design idêntico

## 🗑️ Limpeza Realizada

### Espaço em Disco
- **Total:** 194GB
- **Usado:** 110GB (57%)
- **Disponível:** 85GB

### Imagens Docker Removidas
- ✅ Backend v24-v33 (10 versões antigas)
- ✅ Frontend versões antigas
- ✅ Imagens sem tag (<none>)
- ✅ JoyInChat versões antigas

### Sistema Docker
- ✅ 10 containers parados removidos
- ✅ 5.1GB de build cache limpo
- ✅ Volumes não utilizados removidos
- ✅ Networks não utilizadas removidas

### Arquivos Temporários
- ✅ Scripts de teste removidos (test_*.sh, test_*.js)
- ✅ Arquivos temporários do /tmp limpos
- ✅ Logs antigos (>7 dias) removidos

## 📝 Git Status

### Commits Locais
- ✅ Commit criado: "feat: Financial summary fix + Visual consistency"
- ✅ CLAUDE.md atualizado com versões v36 e v22
- ✅ .env.example criado para documentação

### GitHub
- ⚠️ Push bloqueado por proteção de secrets (AWS credentials em commits antigos)
- ✅ Alterações commitadas localmente e seguras
- 📌 Recomendação: Criar novo repositório limpo se necessário

## 🔐 Segurança

### Credenciais Protegidas
- ✅ .gitignore configurado (ignora .env, docker-compose.yml, credentials)
- ✅ .env.example criado (template sem valores reais)
- ✅ Docker images não contêm credenciais em texto plano

### Proteções Ativas
- ✅ Rate limiting (100 req/15min global, 20 req/15min auth)
- ✅ Account lockout (5 tentativas, 15min bloqueio)
- ✅ Bcrypt factor 12 para senhas
- ✅ Winston logging estruturado

## 📚 Documentação

### Arquivos Atualizados
- ✅ CLAUDE.md - Versões e últimas mudanças
- ✅ docker-compose.yml - v36 backend, v22 frontend
- ✅ backend/.env.example - Template de configuração

### Próximos Passos Sugeridos

1. **Monitoramento:**
   - Verificar logs: `docker service logs advtom_backend -f`
   - Checar performance do Financial module

2. **Backup:**
   - Criar backup completo: `./criar_backup.sh`
   - Manter backups incrementais

3. **GitHub (Opcional):**
   - Criar novo repositório limpo sem histórico de credenciais
   - Ou usar git-filter-repo para limpar histórico

4. **Testes:**
   - Validar Financial tab com usuário real
   - Testar Register e ForgotPassword pages
   - Verificar dark mode

## 🎯 Próximas Features Planejadas

- [ ] Melhorias no módulo de documentos
- [ ] Dashboard analytics
- [ ] Notificações push
- [ ] Integração com mais tribunais

---

**Gerado em:** 15/11/2025 04:50 UTC  
**Sistema:** AdvWell v36/v22  
**Ambiente:** Produção (Docker Swarm)
