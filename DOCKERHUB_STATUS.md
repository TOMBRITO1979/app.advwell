# 🐳 DockerHub - Status das Imagens AdvWell

**Data:** 02/11/2025 19:55 UTC
**Namespace:** tomautomations

---

## ✅ Imagens Publicadas

### Frontend
- **Repositório:** tomautomations/advwell-frontend
- **Tag:** v1-advwell
- **SHA256:** cd728936cc88b9f4a4370f5c3718c9b565835a0c5f12a8499283f5b9d5cb79f1
- **Tamanho:** 53.2MB
- **Criado:** 02/11/2025 19:09 UTC (46 minutos atrás)
- **URL:** https://hub.docker.com/r/tomautomations/advwell-frontend/tags
- **Status:** ✅ PUBLICADO E EM USO

**Conteúdo:**
- React 18 + TypeScript + Vite
- TailwindCSS
- Build com VITE_API_URL=https://api.advwell.pro/api
- Fix de case parts aplicado (handleEdit + handleSubmit)

### Backend
- **Repositório:** tomautomations/advwell-backend
- **Tag:** v1-advwell
- **SHA256:** f323f92b4994641fc51d7896fe2afeed838340b39c687a00119a494d9dea921a
- **Tamanho:** 845MB
- **Criado:** 01/11/2025 19:55 UTC (25 horas atrás)
- **URL:** https://hub.docker.com/r/tomautomations/advwell-backend/tags
- **Status:** ✅ PUBLICADO E EM USO

**Conteúdo:**
- Node.js + Express + TypeScript
- Prisma ORM
- JWT Authentication
- Multitenant com isolamento por companyId
- DataJud integration

---

## 📊 Imagens em Produção

### Serviço Frontend (advtom_frontend)
```
tomautomations/advwell-frontend:v1-advwell
@sha256:cd728936cc88b9f4a4370f5c3718c9b565835a0c5f12a8499283f5b9d5cb79f1
```
✅ Operacional em https://app.advwell.pro

### Serviço Backend (advtom_backend)
```
tomautomations/advwell-backend:v1-advwell
@sha256:f323f92b4994641fc51d7896fe2afeed838340b39c687a00119a494d9dea921a
```
✅ Operacional em https://api.advwell.pro

---

## 🔄 Como Atualizar Imagens

### 1. Build das Novas Imagens

```bash
cd /root/advtom

# Backend
docker build -t tomautomations/advwell-backend:v1-advwell backend/

# Frontend (IMPORTANTE: especificar API URL)
docker build --no-cache \
  --build-arg VITE_API_URL=https://api.advwell.pro/api \
  -t tomautomations/advwell-frontend:v1-advwell \
  frontend/
```

### 2. Push para DockerHub

```bash
# Login no DockerHub (se necessário)
docker login

# Push das imagens
docker push tomautomations/advwell-backend:v1-advwell
docker push tomautomations/advwell-frontend:v1-advwell
```

### 3. Atualizar Serviços

```bash
# Opção A: Update individual
docker service update --image tomautomations/advwell-backend:v1-advwell advtom_backend
docker service update --image tomautomations/advwell-frontend:v1-advwell advtom_frontend

# Opção B: Redeploy completo
docker stack deploy -c docker-compose.yml advtom
```

---

## 📋 Versionamento

### Estratégia de Tags

**Atual:** v1-advwell
- v1 = versão do sistema
- advwell = domínio associado

**Recomendações Futuras:**
- `v2-advwell` - próxima versão major
- `v1.1-advwell` - versão minor
- `v1-advwell-hotfix` - correções urgentes
- `latest` - sempre apontar para versão estável mais recente

### Histórico de Versões

| Versão | Data | Descrição | Status |
|--------|------|-----------|--------|
| v1-advwell | 02/11/2025 | Migração advwell.pro + case parts fix | ✅ ATUAL |
| v7-parts | 01/11/2025 | Case Parts Management (advtom.com) | 🏛️ Legacy |
| v6-parts | 01/11/2025 | Autocomplete + Settings (advtom.com) | 🏛️ Legacy |

---

## 🔐 Credenciais DockerHub

**Namespace:** tomautomations
**Conta:** Configurada no servidor

Para fazer login manualmente:
```bash
docker login
# Username: tomautomations
# Password: [Token de acesso]
```

---

## 📦 Imagens Legacy (Advtom.com)

Caso precise restaurar versões anteriores:

```bash
# Listar tags disponíveis
docker images | grep tomautomations

# Pull de versão específica
docker pull tomautomations/advtom-frontend:v7-parts
docker pull tomautomations/advtom-backend:v7-parts
```

---

## ✅ Checklist de Deploy

Ao fazer deploy de novas imagens:

- [ ] Código testado localmente
- [ ] Build sem erros
- [ ] Frontend com URL correta (VITE_API_URL)
- [ ] Backend sem hardcoded URLs
- [ ] Imagens pushadas para DockerHub
- [ ] docker-compose.yml atualizado (se necessário)
- [ ] Backup do sistema atual criado
- [ ] Deploy executado
- [ ] Serviços convergidos (docker service ps advtom)
- [ ] Health check OK (curl https://api.advwell.pro/health)
- [ ] Frontend acessível (https://app.advwell.pro)
- [ ] Login funcionando
- [ ] Features principais testadas

---

## 🐛 Troubleshooting

### Imagem não atualiza após push
```bash
# Force pull da nova imagem
docker service update --force advtom_frontend
docker service update --force advtom_backend
```

### Erro "image not found"
```bash
# Verificar se a imagem existe no DockerHub
docker search tomautomations/advwell-frontend

# Verificar se você tem permissão
docker login
```

### Serviço não converge
```bash
# Ver logs do serviço
docker service logs advtom_frontend -f
docker service logs advtom_backend -f

# Ver status das tasks
docker service ps advtom_frontend --no-trunc
```

---

## 📊 Estatísticas

- **Total de imagens advwell:** 2 (frontend + backend)
- **Tamanho total:** ~900MB
- **Namespace:** tomautomations
- **Visibilidade:** Public
- **Pull count:** Verificar no DockerHub

---

**Última atualização:** 02/11/2025 19:55 UTC
**Versão atual:** v1-advwell
**Status:** ✅ Todas as imagens publicadas e operacionais
