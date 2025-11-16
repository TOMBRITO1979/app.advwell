# 🔐 PLANO DE IMPLEMENTAÇÃO DE MELHORIAS DE SEGURANÇA - AdvTom

**Data de Início:** 15/11/2025
**Responsável:** Claude Code Security Implementation
**Status:** 🟡 EM PLANEJAMENTO

---

## 📋 ÍNDICE

1. [Backup e Segurança](#backup-e-segurança)
2. [Fases de Implementação](#fases-de-implementação)
3. [Testes por Fase](#testes-por-fase)
4. [Rollback Strategy](#rollback-strategy)
5. [Checklist de Validação](#checklist-de-validação)

---

## 💾 BACKUP E SEGURANÇA

### Backup Criado

**Localização:** `/root/advtom-backups/security-improvements-YYYYMMDD-HHMMSS/`

**Conteúdo:**
- ✅ Código completo (`advtom-full-backup.tar.gz`)
- ✅ Banco de dados (`database-backup.sql`)
- ✅ Schema Prisma (`schema.prisma`)
- ✅ Docker images atuais
- ✅ Configurações de deploy

### Procedimento de Restauração

```bash
# Se algo der errado, execute:
cd /root/advtom-backups/security-improvements-YYYYMMDD-HHMMSS/

# 1. Parar serviços
docker stack rm advtom
sleep 15

# 2. Restaurar código
cd /root/advtom
rm -rf backend frontend
tar -xzf /root/advtom-backups/security-improvements-YYYYMMDD-HHMMSS/advtom-full-backup.tar.gz

# 3. Restaurar banco de dados
docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom < database-backup.sql

# 4. Rebuild e redeploy
./deploy_expect.sh
```

---

## 🎯 FASES DE IMPLEMENTAÇÃO

### **FASE 1: VALIDAÇÃO DE INPUT (Crítico)** - 2-3 dias

**Objetivo:** Implementar validação completa usando express-validator

**Escopo:**
- ✅ Auth endpoints (register, login, forgot-password, reset-password)
- ✅ User endpoints (create, update)
- ✅ Client endpoints (create, update, import CSV)
- ✅ Case endpoints (create, update)
- ✅ Financial endpoints (create, update)

**Arquivos a Modificar:**
1. `backend/src/routes/auth.routes.ts`
2. `backend/src/routes/user.routes.ts`
3. `backend/src/routes/client.routes.ts`
4. `backend/src/routes/case.routes.ts`
5. `backend/src/routes/financial.routes.ts`
6. `backend/src/routes/company.routes.ts`

**Mudanças por Arquivo:**

#### 1.1 Auth Routes (`auth.routes.ts`)

```typescript
import { body, validationResult } from 'express-validator';

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Register validation
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Senha deve ter entre 6 e 100 caracteres'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome da empresa deve ter entre 2 e 200 caracteres'),
  body('cnpj')
    .optional()
    .matches(/^\d{14}$/)
    .withMessage('CNPJ deve ter 14 dígitos'),
];

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Forgot password validation
const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

// Reset password validation
const resetPasswordValidation = [
  body('token').notEmpty().isString(),
  body('password').isLength({ min: 6, max: 100 }),
];

// Apply to routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
```

#### 1.2 User Routes (`user.routes.ts`)

```typescript
const userValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('email').isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6, max: 100 }),
  body('role').optional().isIn(['USER', 'ADMIN', 'SUPER_ADMIN']),
];

router.post('/', userValidation, validate, userController.create);
router.put('/:id', userValidation, validate, userController.update);
```

#### 1.3 Client Routes (`client.routes.ts`)

```typescript
const clientValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('cpf').optional().matches(/^\d{11}$/),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().isLength({ max: 20 }),
  body('notes').optional().isString().isLength({ max: 5000 }),
];

router.post('/', clientValidation, validate, clientController.create);
router.put('/:id', clientValidation, validate, clientController.update);
```

#### 1.4 Case Routes (`case.routes.ts`)

```typescript
const caseValidation = [
  body('processNumber').trim().isLength({ min: 5, max: 50 }),
  body('court').trim().isLength({ min: 2, max: 200 }),
  body('subject').trim().isLength({ min: 2, max: 500 }),
  body('value').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['ACTIVE', 'ARCHIVED', 'FINISHED']),
  body('notes').optional().isString().isLength({ max: 5000 }),
];

router.post('/', caseValidation, validate, caseController.create);
router.put('/:id', caseValidation, validate, caseController.update);
```

#### 1.5 Financial Routes (`financial.routes.ts`)

```typescript
const financialValidation = [
  body('type').isIn(['INCOME', 'EXPENSE']),
  body('description').trim().isLength({ min: 2, max: 500 }),
  body('amount').isFloat({ min: 0.01 }),
  body('clientId').isUUID(),
  body('caseId').optional().isUUID(),
];

router.post('/', financialValidation, validate, financialController.create);
router.put('/:id', financialValidation, validate, financialController.update);
```

**Testes Fase 1:**
- ✅ Criar cliente válido
- ✅ Criar cliente inválido (email malformado)
- ✅ Criar processo válido
- ✅ Criar processo inválido (processNumber muito curto)
- ✅ Login válido
- ✅ Login inválido (email sem @)
- ✅ Todas as rotas antigas ainda funcionam

---

### **FASE 2: SANITIZAÇÃO DE INPUT (Crítico)** - 1-2 dias

**Objetivo:** Prevenir XSS e script injection

**Dependências:**
```bash
npm install --save isomorphic-dompurify
```

**Arquivos a Modificar:**
1. `backend/src/utils/sanitize.ts` (novo)
2. Todos os controllers que recebem texto livre

**Implementação:**

#### 2.1 Criar Utility de Sanitização

```typescript
// backend/src/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitiza strings para prevenir XSS
 */
export const sanitizeString = (input: string | undefined | null): string | undefined => {
  if (!input) return input as undefined;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Remove TODAS as tags HTML
    KEEP_CONTENT: true // Mantém o texto
  });
};

/**
 * Sanitiza objeto recursivamente
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result;
};
```

#### 2.2 Aplicar nos Controllers

```typescript
// Exemplo: client.controller.ts
import { sanitizeObject } from '../utils/sanitize';

export class ClientController {
  async create(req: AuthRequest, res: Response) {
    try {
      // Sanitizar ANTES de usar os dados
      const sanitizedData = sanitizeObject(req.body);
      const { name, cpf, email, phone, address, notes } = sanitizedData;

      // ... resto do código
    }
  }
}
```

**Campos a Sanitizar:**
- `notes` (clientes, processos)
- `description` (transações financeiras, documentos)
- `subject` (processos)
- `address` (clientes, partes do processo)
- Todos os campos de texto livre

**Testes Fase 2:**
- ✅ Criar cliente com `<script>alert('XSS')</script>` em notes
- ✅ Verificar que script foi removido mas texto mantido
- ✅ Criar processo com HTML em subject
- ✅ Verificar sanitização
- ✅ Todas as funcionalidades ainda funcionam

---

### **FASE 3: RATE LIMITING DEDICADO (Alta)** - 1 dia

**Objetivo:** Proteger endpoints de integração contra brute force

**Arquivos a Modificar:**
1. `backend/src/index.ts`
2. `backend/src/routes/integration.routes.ts`

**Implementação:**

```typescript
// backend/src/index.ts

// Rate limiter para API Keys (mais restritivo)
const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Apenas 20 requisições
  keyGenerator: (req) => {
    // Limitar por API Key, não por IP
    return req.header('X-API-Key') || req.ip;
  },
  handler: (req, res) => {
    console.error(`🚨 API Key rate limit exceeded: ${req.ip} | Key: ${req.header('X-API-Key')?.substring(0, 8)}...`);
    res.status(429).json({
      error: 'Muitas requisições',
      message: 'Limite de 20 requisições por 15 minutos excedido'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar aos endpoints de integração
app.use('/api/integration/', apiKeyLimiter);
```

**Testes Fase 3:**
- ✅ Fazer 21 requisições em 1 minuto
- ✅ Verificar que a 21ª foi bloqueada
- ✅ Aguardar 15 minutos e verificar reset
- ✅ Endpoints normais não afetados

---

### **FASE 4: MELHORIAS DE SENHA (Média)** - 1 dia

**Objetivo:** Fortalecer hash de senhas e invalidar tokens

**Arquivos a Modificar:**
1. `backend/src/controllers/auth.controller.ts`

**Mudanças:**

#### 4.1 Aumentar bcrypt factor

```typescript
// Mudar de:
const hashedPassword = await bcrypt.hash(password, 10);

// Para:
const hashedPassword = await bcrypt.hash(password, 12);
```

#### 4.2 Invalidar tokens após uso

```typescript
// No método resetPassword, após trocar a senha:
await prisma.user.update({
  where: { id: user.id },
  data: {
    password: newHashedPassword,
    resetToken: null, // Invalidar token
    resetTokenExpiry: null,
    updatedAt: new Date(),
  },
});
```

**Testes Fase 4:**
- ✅ Registrar novo usuário
- ✅ Verificar tempo de hash (deve ser ~200-300ms)
- ✅ Fazer login com senha correta
- ✅ Fazer login com senha incorreta
- ✅ Reset de senha funciona
- ✅ Tentar usar mesmo token 2x (deve falhar)

---

### **FASE 5: ACCOUNT LOCKOUT (Média)** - 1 dia

**Objetivo:** Prevenir brute force em login

**Arquivos a Modificar:**
1. `backend/prisma/schema.prisma`
2. `backend/src/controllers/auth.controller.ts`

**Schema Changes:**

```prisma
model User {
  // ... campos existentes ...
  loginAttempts     Int       @default(0)
  lockedUntil       DateTime?
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_account_lockout
```

**Implementation:**

```typescript
async login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se conta está bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: 'Conta temporariamente bloqueada',
        message: `Tente novamente em ${minutesLeft} minutos`
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Incrementar tentativas
      const newAttempts = user.loginAttempts + 1;
      const updates: any = { loginAttempts: newAttempts };

      // Bloquear após 5 tentativas
      if (newAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        console.warn(`🔒 Account locked: ${email} (${newAttempts} attempts)`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Login bem-sucedido - resetar tentativas
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // ... gerar token e retornar
  }
}
```

**Testes Fase 5:**
- ✅ Fazer 5 tentativas com senha errada
- ✅ Verificar que conta foi bloqueada
- ✅ Tentar login novamente (deve falhar)
- ✅ Aguardar 15 minutos e tentar (deve funcionar)
- ✅ Login com senha correta reseta tentativas

---

### **FASE 6: LOGGING ESTRUTURADO (Baixa)** - 1-2 dias

**Objetivo:** Melhorar observabilidade e remover logs sensíveis

**Dependências:**
```bash
npm install --save winston
```

**Arquivos a Criar/Modificar:**
1. `backend/src/utils/logger.ts` (novo)
2. Todos os controllers (substituir console.log)

**Implementation:**

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'advtom-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Console apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
```

**Usage:**

```typescript
// Substituir:
console.log(`📧 Enviando email para: ${email}`);

// Por:
logger.info('Email sendo enviado', {
  recipient: email.substring(0, 3) + '***' // Ocultar parte do email
});
```

**Testes Fase 6:**
- ✅ Logs não expõem dados sensíveis
- ✅ Erros são logados corretamente
- ✅ Arquivo de log é criado
- ✅ Rotation funciona (criar >10MB de logs)

---

## 🧪 TESTES POR FASE

### Protocolo de Teste Padrão

**Para cada fase, executar:**

#### 1. Testes Unitários (se aplicável)
```bash
cd backend
npm test
```

#### 2. Testes de Integração - CRUD Completo

**Clientes:**
```bash
# CREATE
curl -X POST https://api.advwell.pro/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Cliente Fase X",
    "cpf": "12345678900",
    "email": "teste@example.com",
    "notes": "Teste após implementação da fase X"
  }'

# READ
curl https://api.advwell.pro/api/clients \
  -H "Authorization: Bearer $TOKEN"

# UPDATE
curl -X PUT https://api.advwell.pro/api/clients/{ID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Atualizado Fase X"
  }'

# DELETE
curl -X DELETE https://api.advwell.pro/api/clients/{ID} \
  -H "Authorization: Bearer $TOKEN"
```

**Processos:**
```bash
# CREATE
curl -X POST https://api.advwell.pro/api/cases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{CLIENT_ID}",
    "processNumber": "1234567-89.2025.8.19.0001",
    "court": "TJRJ",
    "subject": "Test Phase X",
    "value": 10000
  }'

# READ, UPDATE, DELETE (similar)
```

**Transações Financeiras:**
```bash
# CREATE
curl -X POST https://api.advwell.pro/api/financial \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INCOME",
    "description": "Test Phase X",
    "amount": 1500.00,
    "clientId": "{CLIENT_ID}"
  }'
```

#### 3. Testes de Segurança Específicos da Fase

**Fase 1 (Validação):**
- Tentar criar cliente com email inválido (deve falhar 400)
- Tentar criar processo sem processNumber (deve falhar 400)
- Tentar login sem senha (deve falhar 400)

**Fase 2 (Sanitização):**
- Criar cliente com `<script>alert('xss')</script>` em notes
- Verificar que foi sanitizado
- Criar processo com HTML em subject
- Verificar que foi sanitizado

**Fase 3 (Rate Limiting):**
- Script de teste de rate limit (fazer 25 requests rápidas)
- Verificar que algumas foram bloqueadas

**Fase 4 (Senha):**
- Verificar que reset token não funciona 2x
- Verificar tempo de hash da senha

**Fase 5 (Lockout):**
- 5 tentativas de login falhas
- Verificar bloqueio

#### 4. Testes de Regressão

**Verificar que funcionalidades antigas ainda funcionam:**
- ✅ Login/Logout
- ✅ Criação de clientes
- ✅ Criação de processos
- ✅ Upload de documentos
- ✅ Sincronização DataJud
- ✅ Exportação CSV/PDF
- ✅ Integração Chatwoot (SSO)

---

## 🔄 ROLLBACK STRATEGY

### Quando Fazer Rollback

**Critérios:**
- ❌ Testes de CRUD falharam
- ❌ Endpoint crítico retorna erro 500
- ❌ Autenticação quebrou
- ❌ Tenant isolation violado
- ❌ Data loss detectado

### Procedimento de Rollback

#### Rollback Rápido (Código)

```bash
# 1. Parar aplicação
docker stack rm advtom

# 2. Restaurar código
cd /root/advtom
git stash  # Se usando git
# OU
rm -rf backend/src
tar -xzf /root/advtom-backups/security-improvements-TIMESTAMP/advtom-full-backup.tar.gz backend/src

# 3. Rebuild
docker build ...
docker service update ...
```

#### Rollback Completo (Código + DB)

```bash
# 1. Parar tudo
docker stack rm advtom
sleep 15

# 2. Restaurar banco de dados
docker exec -i $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom < /root/advtom-backups/security-improvements-TIMESTAMP/database-backup.sql

# 3. Restaurar código completo
cd /root
rm -rf advtom
tar -xzf /root/advtom-backups/security-improvements-TIMESTAMP/advtom-full-backup.tar.gz

# 4. Redeploy
cd advtom
./deploy_expect.sh
```

### Documentar Rollback

Se rollback necessário, documentar em:
`/root/advtom/ROLLBACK_LOG.md`

```markdown
## Rollback - [Data/Hora]
**Fase:** X
**Motivo:** [Descrição do problema]
**Ação:** [Rollback parcial/completo]
**Status:** [Restaurado com sucesso / Problemas remanescentes]
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes de Cada Fase

- [ ] Backup criado e verificado
- [ ] Branch git criada (se usando git)
- [ ] Dependências instaladas
- [ ] Documentação lida
- [ ] Plano de teste preparado

### Durante a Implementação

- [ ] Código revisado
- [ ] TypeScript compila sem erros
- [ ] Sem warnings críticos
- [ ] Build bem-sucedido
- [ ] Docker image criada

### Depois de Cada Fase

- [ ] Todos os testes passaram
- [ ] CRUD completo testado
- [ ] Testes de segurança específicos passaram
- [ ] Sem regressões detectadas
- [ ] Performance aceitável (< 2x mais lento)
- [ ] Logs verificados (sem erros)
- [ ] Documentação atualizada
- [ ] **GO/NO-GO Decision:** ✅ Prosseguir / ❌ Rollback

---

## 📊 CRONOGRAMA

| Fase | Duração Estimada | Status | Conclusão |
|------|------------------|--------|-----------|
| 0. Backup | 1h | ⏳ | - |
| 1. Validação de Input | 2-3 dias | ⏳ | - |
| 2. Sanitização | 1-2 dias | ⏳ | - |
| 3. Rate Limiting | 1 dia | ⏳ | - |
| 4. Melhorias de Senha | 1 dia | ⏳ | - |
| 5. Account Lockout | 1 dia | ⏳ | - |
| 6. Logging | 1-2 dias | ⏳ | - |
| **TOTAL** | **7-11 dias** | - | - |

---

## 📝 LOG DE IMPLEMENTAÇÃO

### Fase 0: Backup ✅
- **Data:** 15/11/2025 01:26 UTC
- **Status:** ✅ Completo
- **Backup:** `/root/advtom-backups/security-improvements-20251115-012613/`
- **Tamanho:** 6.8GB

### Fase 1: Validação de Input
- **Data Início:** -
- **Status:** ⏳ Aguardando
- **Arquivos Modificados:** -
- **Testes:** -
- **Resultado:** -

### Fase 2: Sanitização
- **Data Início:** -
- **Status:** ⏳ Aguardando
- **Arquivos Modificados:** -
- **Testes:** -
- **Resultado:** -

---

## 🎯 CRITÉRIOS DE SUCESSO

**O projeto será considerado bem-sucedido quando:**

1. ✅ Todas as 6 fases implementadas
2. ✅ Score de segurança >= 90/100
3. ✅ Todos os testes passando
4. ✅ Zero regressões
5. ✅ Performance degradação < 20%
6. ✅ Documentação completa
7. ✅ Auditoria de segurança externa aprovada (recomendado)

---

## 📞 CONTATOS E SUPORTE

**Em caso de problemas:**
1. Verificar `/root/advtom/logs/`
2. Verificar `ROLLBACK_STRATEGY` acima
3. Consultar `SECURITY_AUDIT_REPORT.md`
4. Executar rollback se necessário

---

**Última Atualização:** 15/11/2025 01:26 UTC
**Próxima Revisão:** Após cada fase completada
