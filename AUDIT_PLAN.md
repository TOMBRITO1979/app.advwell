# Plano de Auditoria - Sistema AdvTom (Advogados)

## Checklist Padrão para Cada Aba
```
[x] 1. Frontend: Existe página em frontend/src/pages/
[x] 2. Backend Routes: Existe rota em backend/src/routes/
[x] 3. Backend Controller: Existe controller em backend/src/controllers/
[x] 4. Banco de dados: Existe model no schema.prisma
[x] 5. API conectada: Frontend chama as rotas corretas
[x] 6. Permissões: RBAC configurado (authenticate + requireAdmin quando necessário)
```

---

## Resumo Executivo

| # | Aba | Frontend | Backend Route | BD (Prisma) | Status |
|---|-----|----------|---------------|-------------|--------|
| 1 | Dashboard | Dashboard.tsx | dashboard.routes.ts | agregações | ✅ OK |
| 2 | Audiências | Hearings.tsx | schedule.routes.ts | ScheduleEvent (AUDIENCIA) | ✅ OK |
| 3 | Agenda | Schedule.tsx | schedule.routes.ts | ScheduleEvent | ✅ OK |
| 4 | Tarefas | ToDo.tsx | schedule.routes.ts | ScheduleEvent (TAREFA) | ✅ OK |
| 5 | Clientes | Clients.tsx | client.routes.ts | Client | ✅ OK |
| 6 | Processos | Cases.tsx | case.routes.ts | Case, CasePart, CaseMovement | ✅ OK |
| 7 | Prazos | Deadlines.tsx | case.routes.ts | Case.deadline | ✅ OK |
| 8 | Uploads | Documents.tsx | document.routes.ts | Document | ✅ OK |
| 9 | Documentos | LegalDocuments.tsx | legal-document.routes.ts | LegalDocument | ✅ OK |
| 10 | Atualizações | Updates.tsx | case.routes.ts | CaseMovement | ✅ OK |
| 11 | Financeiro | Financial.tsx | financial.routes.ts | FinancialTransaction | ✅ OK |
| 12 | Planos | ClientSubscriptions.tsx | service-plan.routes.ts + client-subscription.routes.ts | ServicePlan, ClientSubscription | ✅ OK |
| 13 | Config. Stripe | StripeConfig.tsx | stripe-config.routes.ts | StripeConfig | ✅ OK |
| 14 | Contas a Pagar | AccountsPayable.tsx | accounts-payable.routes.ts | AccountPayable | ✅ OK |
| 15 | Campanhas | Campaigns.tsx | campaign.routes.ts | EmailCampaign | ✅ OK |
| 16 | Config. SMTP | SMTPSettings.tsx | smtp-config.routes.ts | SMTPConfig | ✅ OK |
| 17 | Config. IA | AIConfig.tsx | ai-config.routes.ts | AIConfig | ✅ OK |
| 18 | Usuários | Users.tsx | user.routes.ts | User | ✅ OK |
| 19 | Assinatura | Subscription.tsx | subscription.routes.ts | Company.subscription* | ✅ OK |
| 20 | Empresas | Companies.tsx | company.routes.ts | Company | ✅ OK |
| 21 | Alertas Assinatura | SubscriptionAlerts.tsx | company.routes.ts | Company | ✅ OK |
| 22 | Configurações | Settings.tsx | company.routes.ts (/own) | Company | ✅ OK |

---

## Detalhamento por Aba

### 1. Dashboard ✅ FUNCIONANDO
- **Frontend**: `Dashboard.tsx`
- **Backend Route**: `dashboard.routes.ts`
- **Controller**: `dashboard.controller.ts`
- **BD**: Agregações de Cases, Clients, FinancialTransaction, ScheduleEvent
- **API Calls**:
  - `GET /dashboard/stats`
  - `GET /dashboard/upcoming`
  - `GET /dashboard/deadlines`
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 2. Audiências ✅ FUNCIONANDO
- **Frontend**: `Hearings.tsx`
- **Backend Route**: `schedule.routes.ts`
- **Controller**: `schedule.controller.ts`
- **BD**: `ScheduleEvent` com `type = AUDIENCIA`
- **API Calls**:
  - `GET /schedule?type=AUDIENCIA`
  - `POST /schedule` (com type: 'AUDIENCIA')
  - `PUT /schedule/:id`
  - `DELETE /schedule/:id`
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 3. Agenda ✅ FUNCIONANDO
- **Frontend**: `Schedule.tsx`
- **Backend Route**: `schedule.routes.ts`
- **Controller**: `schedule.controller.ts`
- **BD**: `ScheduleEvent`
- **API Calls**:
  - `GET /schedule`
  - `POST /schedule`
  - `PUT /schedule/:id`
  - `DELETE /schedule/:id`
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 4. Tarefas ✅ FUNCIONANDO
- **Frontend**: `ToDo.tsx`
- **Backend Route**: `schedule.routes.ts`
- **Controller**: `schedule.controller.ts`
- **BD**: `ScheduleEvent` com `type = TAREFA`, `EventAssignment`
- **API Calls**:
  - `GET /schedule?type=TAREFA`
  - `POST /schedule` (com type: 'TAREFA')
  - `PUT /schedule/:id`
  - `DELETE /schedule/:id`
  - `GET /users` (para atribuições)
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 5. Clientes ✅ FUNCIONANDO
- **Frontend**: `Clients.tsx`
- **Backend Route**: `client.routes.ts`
- **Controller**: `client.controller.ts`
- **BD**: `Client`
- **API Calls**:
  - `GET /clients`
  - `GET /clients/search`
  - `GET /clients/export/csv`
  - `POST /clients/import/csv`
  - `POST /clients`
  - `PUT /clients/:id`
  - `DELETE /clients/:id`
- **Permissões**: authenticate + validateTenant
- **Validações**: express-validator (nome 2-200 chars, CPF/CNPJ, email)
- **Status**: ✅ OK

### 6. Processos ✅ FUNCIONANDO
- **Frontend**: `Cases.tsx`
- **Backend Route**: `case.routes.ts`
- **Controller**: `case.controller.ts`
- **BD**: `Case`, `CasePart`, `CaseMovement`, `CaseDocument`, `CaseAuditLog`
- **API Calls**:
  - `GET /cases`
  - `GET /cases/search`
  - `GET /cases/:id`
  - `GET /cases/:id/audit-logs`
  - `POST /cases`
  - `PUT /cases/:id`
  - `POST /cases/:id/sync` (sincronizar movimentações)
  - `POST /cases/:id/generate-summary` (IA)
  - `GET /cases/export/csv`
  - `POST /cases/import/csv`
- **Permissões**: authenticate + validateTenant
- **Validações**: express-validator completo
- **Status**: ✅ OK

### 7. Prazos ✅ FUNCIONANDO
- **Frontend**: `Deadlines.tsx`
- **Backend Route**: `case.routes.ts`
- **Controller**: `case.controller.ts`
- **BD**: `Case.deadline`, `Case.deadlineResponsibleId`, `Case.deadlineCompleted`
- **API Calls**:
  - `GET /cases/deadlines`
  - `PUT /cases/:id/deadline`
  - `POST /cases/:id/deadline/toggle`
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 8. Uploads ✅ FUNCIONANDO
- **Frontend**: `Documents.tsx`
- **Backend Route**: `document.routes.ts`
- **Controller**: `document.controller.ts`
- **BD**: `Document` (storageType: 'upload' | 'link')
- **API Calls**:
  - `GET /documents`
  - `GET /documents/search`
  - `GET /documents/:id`
  - `GET /documents/:id/download`
  - `POST /documents/upload` (multipart/form-data)
  - `POST /documents` (link externo)
  - `PUT /documents/:id`
  - `DELETE /documents/:id`
- **Permissões**: authenticate + validateTenant
- **Integração**: AWS S3 para storage
- **Status**: ✅ OK

### 9. Documentos (Jurídicos) ✅ FUNCIONANDO
- **Frontend**: `LegalDocuments.tsx`
- **Backend Route**: `legal-document.routes.ts`
- **Controller**: `legal-document.controller.ts`
- **BD**: `LegalDocument`
- **API Calls**:
  - `GET /legal-documents`
  - `GET /legal-documents/:id`
  - `GET /legal-documents/:id/pdf`
  - `GET /legal-documents/client/:clientId/qualification`
  - `POST /legal-documents`
  - `POST /legal-documents/:id/review` (revisão com IA)
  - `PUT /legal-documents/:id`
  - `DELETE /legal-documents/:id`
- **Permissões**: authenticate + validateTenant
- **Validações**: express-validator (título 2-200 chars, conteúdo mín 10 chars)
- **Status**: ✅ OK

### 10. Atualizações ✅ FUNCIONANDO
- **Frontend**: `Updates.tsx`
- **Backend Route**: `case.routes.ts`
- **Controller**: `case.controller.ts`
- **BD**: `CaseMovement`, `Case.ultimoAndamento`, `Case.informarCliente`
- **API Calls**:
  - `GET /cases/updates`
  - `POST /cases/:id/acknowledge`
- **Permissões**: authenticate + validateTenant
- **Status**: ✅ OK

### 11. Financeiro ✅ FUNCIONANDO
- **Frontend**: `Financial.tsx`
- **Backend Route**: `financial.routes.ts`
- **Controller**: `financial.controller.ts`
- **BD**: `FinancialTransaction`, `InstallmentPayment`
- **API Calls**:
  - `GET /financial`
  - `GET /financial/summary`
  - `GET /financial/:id`
  - `GET /financial/:id/receipt`
  - `GET /financial/export/pdf`
  - `GET /financial/export/csv`
  - `POST /financial/import/csv`
  - `POST /financial`
  - `PUT /financial/:id`
  - `DELETE /financial/:id`
  - `GET /financial/:transactionId/installments`
  - `PUT /financial/installments/:installmentId`
  - `GET /financial/installments/:installmentId/receipt`
- **Permissões**: authenticate + validateTenant
- **Validações**: express-validator (type INCOME/EXPENSE, amount > 0)
- **Status**: ✅ OK

### 12. Planos ✅ FUNCIONANDO
- **Frontend**: `ClientSubscriptions.tsx`
- **Backend Route**: `service-plan.routes.ts`, `client-subscription.routes.ts`
- **Controller**: `service-plan.controller.ts`, `client-subscription.controller.ts`
- **BD**: `ServicePlan`, `ClientSubscription`, `SubscriptionPayment`
- **API Calls (service-plan)**:
  - `GET /service-plans`
  - `GET /service-plans/:id`
  - `POST /service-plans`
  - `PUT /service-plans/:id`
  - `DELETE /service-plans/:id`
  - `POST /service-plans/:id/sync` (Stripe)
- **API Calls (client-subscription)**:
  - `GET /client-subscriptions`
  - `GET /client-subscriptions/reports`
  - `GET /client-subscriptions/:id`
  - `GET /client-subscriptions/:id/payments`
  - `POST /client-subscriptions`
  - `POST /client-subscriptions/:id/cancel`
  - `POST /client-subscriptions/:id/regenerate-checkout`
- **Permissões**: authenticate + validateTenant + requireAdmin
- **Integração**: Stripe
- **Status**: ✅ OK

### 13. Config. Stripe ✅ FUNCIONANDO
- **Frontend**: `StripeConfig.tsx`
- **Backend Route**: `stripe-config.routes.ts`
- **Controller**: `stripe-config.controller.ts`
- **BD**: `StripeConfig`
- **API Calls**:
  - `GET /stripe-config`
  - `POST /stripe-config`
  - `PUT /stripe-config`
  - `POST /stripe-config/test`
  - `DELETE /stripe-config`
- **Permissões**: authenticate + validateTenant + requireAdmin
- **Validações**: stripePublicKey (pk_), stripeSecretKey (sk_), webhookSecret (whsec_)
- **Status**: ✅ OK

### 14. Contas a Pagar ✅ FUNCIONANDO
- **Frontend**: `AccountsPayable.tsx`
- **Backend Route**: `accounts-payable.routes.ts`
- **Controller**: `accounts-payable.controller.ts`
- **BD**: `AccountPayable`
- **API Calls**:
  - `GET /accounts-payable`
  - `GET /accounts-payable/categories`
  - `GET /accounts-payable/statement`
  - `GET /accounts-payable/statement/pdf`
  - `GET /accounts-payable/statement/csv`
  - `GET /accounts-payable/export/pdf`
  - `GET /accounts-payable/export/csv`
  - `POST /accounts-payable/import/csv`
  - `GET /accounts-payable/:id`
  - `POST /accounts-payable`
  - `PUT /accounts-payable/:id`
  - `DELETE /accounts-payable/:id`
  - `POST /accounts-payable/:id/pay`
- **Permissões**: authenticate + validateTenant
- **Validações**: express-validator (supplier, description, amount, dueDate)
- **Status**: ✅ OK

### 15. Campanhas ✅ FUNCIONANDO
- **Frontend**: `Campaigns.tsx`
- **Backend Route**: `campaign.routes.ts`
- **Controller**: `campaign.controller.ts`
- **BD**: `EmailCampaign`, `CampaignRecipient`
- **API Calls**:
  - `GET /campaigns`
  - `GET /campaigns/templates`
  - `GET /campaigns/templates/:id`
  - `GET /campaigns/:id`
  - `POST /campaigns`
  - `DELETE /campaigns/:id`
  - `POST /campaigns/:id/send`
- **Permissões**: authenticate + validateTenant + requireAdmin
- **Validações**: name, subject, body, recipients (1-500)
- **Status**: ✅ OK

### 16. Config. SMTP ✅ FUNCIONANDO
- **Frontend**: `SMTPSettings.tsx`
- **Backend Route**: `smtp-config.routes.ts`
- **Controller**: `smtp-config.controller.ts`
- **BD**: `SMTPConfig`
- **API Calls**:
  - `GET /smtp-config`
  - `POST /smtp-config`
  - `PUT /smtp-config`
  - `POST /smtp-config/test`
  - `DELETE /smtp-config`
- **Permissões**: authenticate + validateTenant + requireAdmin
- **Validações**: host, port (1-65535), user, password, fromEmail
- **Status**: ✅ OK

### 17. Config. IA ✅ FUNCIONANDO
- **Frontend**: `AIConfig.tsx`
- **Backend Route**: `ai-config.routes.ts`
- **Controller**: `ai-config.controller.ts`
- **BD**: `AIConfig`
- **API Calls**:
  - `GET /ai-config`
  - `GET /ai-config/models`
  - `POST /ai-config`
  - `POST /ai-config/test`
  - `POST /ai-config/test-provider`
  - `DELETE /ai-config`
- **Permissões**: authenticate + validateTenant + requireAdmin
- **Validações**: provider (openai/gemini/anthropic/groq), model, apiKey
- **Providers Suportados**: OpenAI, Google Gemini, Anthropic, Groq
- **Status**: ✅ OK

### 18. Usuários ✅ FUNCIONANDO
- **Frontend**: `Users.tsx`
- **Backend Route**: `user.routes.ts`
- **Controller**: `user.controller.ts`
- **BD**: `User`, `Permission`
- **API Calls**:
  - `GET /users/profile`
  - `PUT /users/profile`
  - `POST /users/profile/photo`
  - `GET /users`
  - `POST /users`
  - `PUT /users/:id`
  - `DELETE /users/:id`
- **Permissões**:
  - Profile: apenas authenticate
  - CRUD: authenticate + requireAdmin + validateTenant
- **Validações**:
  - nome 2-200 chars, email válido
  - senha 12-100 chars com maiúscula, minúscula, número e caractere especial
  - role: USER, ADMIN, SUPER_ADMIN
- **Status**: ✅ OK

### 19. Assinatura ✅ FUNCIONANDO
- **Frontend**: `Subscription.tsx`
- **Backend Route**: `subscription.routes.ts`
- **Controller**: `subscription.controller.ts`
- **BD**: `Company.subscriptionStatus`, `Company.stripeCustomerId`, etc.
- **API Calls**:
  - `GET /subscription/plans` (público)
  - `GET /subscription/info`
  - `GET /subscription/status`
  - `POST /subscription/checkout`
  - `POST /subscription/billing-portal`
  - `POST /subscription/webhook` (raw body)
- **Permissões**: authenticate + validateTenant (exceto /plans e /webhook)
- **Integração**: Stripe
- **Status**: ✅ OK

### 20. Empresas ✅ FUNCIONANDO
- **Frontend**: `Companies.tsx`
- **Backend Route**: `company.routes.ts`
- **Controller**: `company.controller.ts`
- **BD**: `Company`
- **API Calls**:
  - `GET /companies`
  - `POST /companies`
  - `GET /companies/:id/users`
  - `PUT /companies/:companyId/users/:userId/toggle-active`
  - `PUT /companies/:id/subscription`
  - `GET /companies/:id/last-payment`
  - `PUT /companies/:id`
  - `DELETE /companies/:id`
- **Permissões**: authenticate + requireSuperAdmin
- **Status**: ✅ OK

### 21. Alertas Assinatura ✅ FUNCIONANDO
- **Frontend**: `SubscriptionAlerts.tsx`
- **Backend Route**: `company.routes.ts`
- **Controller**: `company.controller.ts`
- **BD**: `Company.subscriptionStatus`, `Company.trialEndsAt`
- **API Calls**:
  - `GET /companies/subscription-alerts`
- **Permissões**: authenticate + requireSuperAdmin
- **Status**: ✅ OK

### 22. Configurações ✅ FUNCIONANDO
- **Frontend**: `Settings.tsx`
- **Backend Route**: `company.routes.ts`
- **Controller**: `company.controller.ts`
- **BD**: `Company`
- **API Calls**:
  - `GET /companies/own`
  - `PUT /companies/own`
  - `GET /companies/own/api-key`
  - `POST /companies/own/api-key/regenerate`
- **Permissões**: authenticate + requireAdmin
- **Status**: ✅ OK

---

## Resumo Final

### Totalmente Funcionais (22 abas) ✅

Todas as 22 abas estão funcionando corretamente:

1. ✅ Dashboard
2. ✅ Audiências
3. ✅ Agenda
4. ✅ Tarefas
5. ✅ Clientes
6. ✅ Processos
7. ✅ Prazos
8. ✅ Uploads
9. ✅ Documentos
10. ✅ Atualizações
11. ✅ Financeiro
12. ✅ Planos
13. ✅ Config. Stripe
14. ✅ Contas a Pagar
15. ✅ Campanhas
16. ✅ Config. SMTP
17. ✅ Config. IA
18. ✅ Usuários
19. ✅ Assinatura
20. ✅ Empresas
21. ✅ Alertas Assinatura
22. ✅ Configurações

---

## Arquitetura Técnica

### Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL
- **Storage**: AWS S3
- **Pagamentos**: Stripe
- **Email**: SMTP configurável
- **IA**: OpenAI, Gemini, Anthropic, Groq

### Segurança
- **Autenticação**: JWT com refresh tokens
- **Middleware**: authenticate, validateTenant, requireAdmin, requireSuperAdmin
- **Validação**: express-validator em todas as rotas de criação/atualização
- **Multi-tenant**: Isolamento por companyId

### Integrações
- **Stripe**: Assinaturas do escritório + Planos para clientes
- **S3**: Upload e storage de documentos
- **IA**: Geração de resumos de processos, revisão de documentos
- **SMTP**: Campanhas de email

---

## Data da Auditoria
**Data**: 2025-12-03
**Status**: COMPLETO - Todas as 22 abas verificadas e funcionando
