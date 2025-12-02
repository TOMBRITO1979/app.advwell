# PLANO PARA LEVAR O ADVWELL A NOTA 10/10

**Data:** 02/12/2025
**Situacao Atual:** 7.3/10
**Meta:** 10/10 (Producao Enterprise-Ready)

---

## FASE 1: CREDENCIAIS E SEGURANCA (CONCLUIDA PARCIALMENTE)

### 1.1 Credenciais a Revogar (VOCE PRECISA FAZER)

| Servico | Acao Necessaria |
|---------|-----------------|
| **AWS IAM** | Revogar chave `AKIAUD4L3FBLAQQX67MB` e criar nova |
| **PostgreSQL** | Alterar senha do banco (atualmente exposta) |
| **Gmail App** | Revogar senha de app `ailjaqgbwkwkipvf` e criar nova |
| **Stripe** | Regenerar chaves no Dashboard Stripe |
| **DataJud** | Verificar se API key precisa rotacao |

### 1.2 Gerar Novas Credenciais

```bash
# Gerar JWT_SECRET (32 bytes = 64 hex chars)
openssl rand -hex 32

# Gerar ENCRYPTION_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# Gerar POSTGRES_PASSWORD (20 bytes = 40 hex chars)
openssl rand -hex 20
```

### 1.3 Arquivo .env
- [x] Criado com placeholders para novas credenciais
- [x] Confirmado que NAO esta no Git
- [ ] Aguardando usuario preencher com novas credenciais

---

## FASE 2: CORRIGIR VULNERABILIDADES CRITICAS

### 2.1 XSS em Campanhas (frontend/src/pages/Campaigns.tsx)

**Problema:** `dangerouslySetInnerHTML` sem sanitizacao
**Solucao:**
```bash
cd frontend && npm install dompurify @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

// Substituir:
dangerouslySetInnerHTML={{ __html: selectedCampaign.body }}

// Por:
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(selectedCampaign.body, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'img', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'div', 'span', 'table', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class']
  })
}}
```

### 2.2 Route Hijacking (backend/src/routes/case.routes.ts)

**Problema:** Rotas parametricas antes de literais
**Solucao:** Reorganizar rotas

```typescript
// ANTES (errado):
router.get('/:id', controller.get);
router.get('/search', controller.search);  // NUNCA ALCANCADA!

// DEPOIS (correto):
router.get('/search', controller.search);  // LITERAL PRIMEIRO
router.get('/export/csv', controller.exportCSV);
router.get('/:id', controller.get);  // PARAMETRICA POR ULTIMO
```

**Arquivos afetados:**
- backend/src/routes/case.routes.ts
- backend/src/routes/financial.routes.ts

### 2.3 JSON.parse Inseguro (frontend/src/pages/Documents.tsx)

**Problema:** JSON.parse sem try-catch + open redirect
**Solucao:**
```tsx
try {
  const text = await response.data.text();
  const data = JSON.parse(text);

  if (data.downloadUrl && typeof data.downloadUrl === 'string') {
    const url = new URL(data.downloadUrl);
    if (['http:', 'https:'].includes(url.protocol)) {
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }
} catch (error) {
  console.error('Erro ao processar documento:', error);
  toast.error('Erro ao processar documento');
}
```

---

## FASE 3: INDEXES NO PRISMA SCHEMA

**Arquivo:** backend/prisma/schema.prisma

### 3.1 Indexes a Adicionar

```prisma
model Client {
  // ... campos existentes
  @@index([companyId])
  @@index([email])
  @@index([cpfCnpj])
  @@index([companyId, createdAt])
}

model Case {
  // ... campos existentes
  @@index([companyId])
  @@index([clientId])
  @@index([processNumber])
  @@index([status])
  @@index([companyId, createdAt])
}

model FinancialTransaction {
  // ... campos existentes
  @@index([companyId])
  @@index([clientId])
  @@index([caseId])
  @@index([type])
  @@index([date])
  @@index([companyId, date])
}

model Document {
  // ... campos existentes
  @@index([companyId])
  @@index([clientId])
  @@index([caseId])
  @@index([type])
}

model CaseMovement {
  // ... campos existentes
  @@index([caseId])
  @@index([date])
}

model Deadline {
  // ... campos existentes
  @@index([companyId])
  @@index([caseId])
  @@index([dueDate])
  @@index([status])
}

model ScheduleEvent {
  // ... campos existentes
  @@index([companyId])
  @@index([userId])
  @@index([date])
  @@index([type])
}

model AccountPayable {
  // ... campos existentes
  @@index([companyId])
  @@index([dueDate])
  @@index([status])
}

model ClientSubscription {
  // ... campos existentes
  @@index([companyId])
  @@index([clientId])
  @@index([status])
}

model EmailCampaign {
  // ... campos existentes
  @@index([companyId])
  @@index([status])
}
```

### 3.2 Corrigir Inconsistencia de Enum

```prisma
// Em ClientSubscription, mudar:
CANCELED  // Para manter padrao

// OU em Company, mudar:
CANCELLED -> CANCELED

// ESCOLHER UM PADRAO E APLICAR EM TODO O CODIGO
```

---

## FASE 4: CORRECOES DE CODIGO

### 4.1 Fallback de Encriptacao Inseguro

**Arquivo:** backend/src/utils/encryption.ts
```typescript
// ANTES:
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

// DEPOIS:
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY deve ser definida e ter 64 caracteres hex');
}
```

### 4.2 Validacao de SSO Token (frontend/src/pages/Embed.tsx)

```typescript
interface EmbedAuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string; };
}

// Validar resposta antes de usar
const data = await response.json() as EmbedAuthResponse;
if (!data.token || !data.user?.id) {
  throw new Error('Resposta invalida do servidor');
}
```

### 4.3 Promise.allSettled no Dashboard

```typescript
// ANTES:
const [statsRes, eventsRes, ...] = await Promise.all([...]);

// DEPOIS:
const results = await Promise.allSettled([
  api.get('/dashboard/stats'),
  api.get('/schedule'),
  // ...
]);

// Processar resultados individualmente
const statsRes = results[0].status === 'fulfilled' ? results[0].value : null;
const eventsRes = results[1].status === 'fulfilled' ? results[1].value : null;
```

### 4.4 Tipagem Segura de Erros

```typescript
// ANTES:
catch (error: any) {
  toast.error(error.response?.data?.error || 'Erro');
}

// DEPOIS:
import axios from 'axios';

catch (error) {
  if (axios.isAxiosError(error)) {
    toast.error(error.response?.data?.error || 'Erro na requisicao');
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('Erro desconhecido');
  }
}
```

---

## FASE 5: INFRAESTRUTURA DOCKER

### 5.1 Atualizar docker-compose.yml

```yaml
backend:
  image: tomautomations/advwell-backend:v122-security-fixes
  deploy:
    replicas: 3  # Manter 3 replicas

frontend:
  image: tomautomations/advwell-frontend:v122-security-fixes
  deploy:
    replicas: 2  # Aumentar para 2 replicas (HA)
```

### 5.2 Ativar PgBouncer (Opcional para Alta Escala)

Descomentar secao do PgBouncer no docker-compose.yml quando necessario.

---

## FASE 6: DEPLOY E VALIDACAO

### 6.1 Sequencia de Deploy

```bash
# 1. Preencher .env com novas credenciais
nano /root/advtom/.env

# 2. Rodar migracao do Prisma (indexes)
docker exec -it $(docker ps -q -f name=advtom_backend) npx prisma migrate deploy

# 3. Build e push das novas imagens
cd /root/advtom
docker build -t tomautomations/advwell-backend:v122-security-fixes backend/
docker build --build-arg VITE_API_URL=https://api.advwell.pro/api -t tomautomations/advwell-frontend:v122-security-fixes frontend/
docker push tomautomations/advwell-backend:v122-security-fixes
docker push tomautomations/advwell-frontend:v122-security-fixes

# 4. Atualizar docker-compose.yml com novas versoes

# 5. Deploy
./deploy.sh

# 6. Verificar
curl https://api.advwell.pro/health
```

### 6.2 Checklist de Validacao

- [ ] Health check retorna OK
- [ ] Login funciona
- [ ] Busca de processos funciona (/cases/search)
- [ ] Relatorios financeiros funcionam (/financial/summary)
- [ ] Email de campanha preview nao executa scripts
- [ ] Documentos abrem corretamente
- [ ] Dashboard carrega sem erros

---

## RESUMO DE IMPACTO

| Fase | Impacto na Nota |
|------|-----------------|
| FASE 1: Credenciais | +0.5 (7.3 -> 7.8) |
| FASE 2: Vulnerabilidades | +1.0 (7.8 -> 8.8) |
| FASE 3: Indexes | +0.5 (8.8 -> 9.3) |
| FASE 4: Codigo | +0.4 (9.3 -> 9.7) |
| FASE 5: Infra | +0.2 (9.7 -> 9.9) |
| FASE 6: Validacao | +0.1 (9.9 -> 10.0) |

---

## CREDENCIAIS NECESSARIAS DO USUARIO

Para prosseguir, preciso que voce forneca:

1. **AWS:** Nova Access Key ID e Secret (revogar a antiga no IAM)
2. **PostgreSQL:** Nova senha do banco
3. **Gmail:** Nova senha de app (Conta Google > Seguranca > Senhas de app)
4. **Stripe:** Novas chaves (Dashboard Stripe > Developers > API keys)
5. **(Opcional)** DataJud: Se precisar nova key

Apos receber as credenciais, executarei as FASES 2-6 automaticamente.
