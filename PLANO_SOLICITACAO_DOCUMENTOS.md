# PLANO: Funcionalidade de Solicitação de Documentos

**Data de Criação:** 2026-01-21
**Status:** Aguardando Implementação
**Prioridade:** Alta

---

## Resumo Executivo

Criar uma nova aba "Solicitações de Documentos" que permite ao escritório solicitar documentos aos clientes com prazo, enviar notificações automáticas (Email/WhatsApp) e cobrar automaticamente quando o prazo vencer.

---

## Fluxo da Funcionalidade

```
1. Escritório seleciona cliente
2. Descreve documento solicitado
3. Define prazo de entrega
4. Adiciona observações internas (opcional)
5. Seleciona template de Email/WhatsApp
6. Sistema envia notificação ao cliente
7. Sistema envia lembretes automáticos:
   - 24h antes do prazo
   - Quando vencer
   - A cada X dias se não receber
8. Cliente visualiza no Portal e envia documento
9. Escritório recebe e marca como concluído
```

---

## Modelo de Dados

### Nova Tabela: `document_requests`

```prisma
model DocumentRequest {
  id                   String    @id @default(uuid())
  companyId            String
  clientId             String
  requestedByUserId    String?

  // O que foi pedido
  documentName         String    @map("document_name")
  description          String?   @db.Text
  internalNotes        String?   @db.Text @map("internal_notes")

  // Prazo e Status
  dueDate              DateTime  @map("due_date")
  status               String    @default("PENDING") // PENDING, SENT, REMINDED, RECEIVED, CANCELLED

  // Comunicação
  notificationChannel  String?   @map("notification_channel") // EMAIL, WHATSAPP, BOTH
  emailTemplateId      String?   @map("email_template_id")
  whatsappTemplateId   String?   @map("whatsapp_template_id")

  // Automação
  autoRemind           Boolean   @default(true) @map("auto_remind")
  autoFollowup         Boolean   @default(true) @map("auto_followup")
  lastReminderAt       DateTime? @map("last_reminder_at")
  reminderCount        Int       @default(0) @map("reminder_count")

  // Resolução
  receivedAt           DateTime? @map("received_at")
  receivedDocumentId   String?   @map("received_document_id")
  clientNotes          String?   @db.Text @map("client_notes")

  // Metadados
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  // Relations
  company              Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  client               Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  requestedBy          User?     @relation(fields: [requestedByUserId], references: [id], onDelete: SetNull)
  receivedDocument     SharedDocument? @relation(fields: [receivedDocumentId], references: [id], onDelete: SetNull)

  @@index([companyId])
  @@index([clientId])
  @@index([status])
  @@index([dueDate])
  @@index([companyId, status])
  @@index([companyId, clientId, status])
  @@map("document_requests")
}
```

### Migration SQL

```sql
-- Migration: create_document_requests_table
-- Date: 2026-01-21

CREATE TABLE document_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "clientId"              UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  "requestedByUserId"     UUID REFERENCES users(id) ON DELETE SET NULL,

  document_name           VARCHAR(255) NOT NULL,
  description             TEXT,
  internal_notes          TEXT,

  due_date                TIMESTAMP NOT NULL,
  status                  VARCHAR(50) DEFAULT 'PENDING',

  notification_channel    VARCHAR(20),
  email_template_id       UUID,
  whatsapp_template_id    UUID,

  auto_remind             BOOLEAN DEFAULT true,
  auto_followup           BOOLEAN DEFAULT true,
  last_reminder_at        TIMESTAMP,
  reminder_count          INT DEFAULT 0,

  received_at             TIMESTAMP,
  received_document_id    UUID REFERENCES shared_documents(id) ON DELETE SET NULL,
  client_notes            TEXT,

  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_requests_company ON document_requests("companyId");
CREATE INDEX idx_document_requests_client ON document_requests("clientId");
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_due_date ON document_requests(due_date);
CREATE INDEX idx_document_requests_company_status ON document_requests("companyId", status);
```

---

## Backend - Arquivos a Criar

### 1. Controller: `backend/src/controllers/document-request.controller.ts`

Métodos:
- `create()` - Criar solicitação + enviar notificação
- `list()` - Listar com filtros (status, cliente, prazo)
- `get()` - Detalhes de uma solicitação
- `update()` - Atualizar prazo, descrição, status
- `cancel()` - Cancelar solicitação
- `sendReminder()` - Enviar lembrete manual
- `markAsReceived()` - Marcar como recebido
- `listOverdue()` - Listar vencidas (para dashboard)
- `listForClient()` - Listar para o portal do cliente

### 2. Routes: `backend/src/routes/document-request.routes.ts`

```typescript
// Rotas do escritório (autenticadas)
router.post('/', create);
router.get('/', list);
router.get('/overdue', listOverdue);
router.get('/stats', getStats);
router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', cancel);
router.post('/:id/reminder', sendReminder);
router.post('/:id/received', markAsReceived);

// Rotas do portal do cliente
router.get('/client/:clientId', listForClient);
router.post('/:id/submit', clientSubmitDocument);
```

### 3. Job: `backend/src/jobs/document-request-reminder.job.ts`

```typescript
// Executar via cron a cada hora
// 1. Buscar solicitações com prazo em 24h (status PENDING/SENT)
// 2. Buscar solicitações vencidas (status != RECEIVED/CANCELLED)
// 3. Enviar lembretes via WhatsApp/Email
// 4. Atualizar lastReminderAt e reminderCount
```

### 4. Registrar no index: `backend/src/routes/index.ts`

```typescript
import documentRequestRoutes from './document-request.routes';
router.use('/document-requests', documentRequestRoutes);
```

---

## Frontend - Arquivos a Criar

### 1. Página Principal: `frontend/src/pages/DocumentRequests.tsx`

- Tabela com lista de solicitações
- Filtros: Cliente, Status, Período
- Badges de status (Pendente, Vencido, Recebido)
- Ações: Editar, Enviar Lembrete, Cancelar

### 2. Modal de Criação: `frontend/src/components/DocumentRequestModal.tsx`

- Select de cliente
- Campo de documento solicitado
- Date picker para prazo
- Textarea para observações internas
- Select de canal (Email/WhatsApp/Ambos)
- Select de template
- Checkboxes de automação

### 3. Portal do Cliente: `frontend/src/pages/ClientPortal/DocumentRequests.tsx`

- Lista de documentos solicitados
- Status visual (pendente, vencido)
- Botão de upload
- Confirmação de envio

### 4. Adicionar ao Menu: `frontend/src/components/Layout.tsx`

```typescript
{
  name: 'Solicitações',
  icon: FileQuestion, // ou outro ícone
  path: '/solicitacoes',
}
```

---

## Integrações

### Com Templates Existentes

1. **Email Campaigns** - Usar templates de `email_campaigns` para formatação
2. **WhatsApp Templates** - Usar `whatsapp_templates` para mensagens

### Variáveis de Template

```
{{cliente_nome}} - Nome do cliente
{{documento_nome}} - Nome do documento solicitado
{{prazo}} - Data do prazo formatada
{{dias_restantes}} - Dias até o prazo
{{link_portal}} - Link para o portal do cliente
{{escritorio_nome}} - Nome do escritório
```

### Com SharedDocuments

Quando cliente enviar documento:
1. Criar registro em `shared_documents`
2. Atualizar `document_requests.received_document_id`
3. Atualizar `document_requests.status = 'RECEIVED'`
4. Atualizar `document_requests.received_at`

---

## Cron Jobs

Adicionar ao `backend/src/index.ts`:

```typescript
// Verificar solicitações de documentos a cada hora
cron.schedule('0 * * * *', async () => {
  await processDocumentRequestReminders();
});
```

---

## Dashboard - Widgets

Adicionar ao dashboard:
- Card "Documentos Pendentes" com contador
- Card "Documentos Vencidos" (vermelho) com contador
- Link para a aba de solicitações

---

## Permissões

Adicionar ao sistema de permissões:
- `document_requests:create` - Criar solicitações
- `document_requests:read` - Visualizar solicitações
- `document_requests:update` - Editar solicitações
- `document_requests:delete` - Cancelar solicitações
- `document_requests:send_reminder` - Enviar lembretes

---

## Fases de Implementação

### Fase 1: Backend Base
- [x] Criar modelo Prisma (backend/prisma/schema.prisma)
- [x] Criar migration SQL (backend/migrations_manual/create_document_requests_table.sql)
- [x] Aplicar migration
- [x] Criar controller com CRUD básico (backend/src/controllers/document-request.controller.ts)
- [x] Criar rotas (backend/src/routes/document-request.routes.ts)
- [ ] Testar endpoints

### Fase 2: Notificações
- [ ] Integrar com WhatsApp queue
- [ ] Integrar com Email queue
- [ ] Criar job de lembretes automáticos
- [ ] Configurar cron

### Fase 3: Frontend Escritório
- [x] Criar página de listagem (frontend/src/pages/DocumentRequests.tsx)
- [x] Criar modal de criação
- [x] Adicionar ao menu (frontend/src/components/Layout.tsx)
- [x] Implementar filtros
- [x] Implementar ações

### Fase 4: Portal do Cliente
- [ ] Criar página de solicitações no portal
- [ ] Implementar upload de documento
- [ ] Integrar com SharedDocuments

### Fase 5: Dashboard e Relatórios
- [ ] Adicionar widgets ao dashboard
- [ ] Criar relatório de solicitações
- [ ] Métricas de tempo de resposta

---

## Estimativa de Arquivos

| Tipo | Quantidade | Arquivos |
|------|------------|----------|
| Backend | 4 | controller, routes, job, migration |
| Frontend | 3 | página, modal, portal |
| Prisma | 1 | schema update |
| Total | 8 | arquivos novos/modificados |

---

## Notas Adicionais

- Manter compatibilidade com sistema existente
- Não afetar funcionalidades em produção
- Fazer deploy em horário de baixo uso
- Testar em ambiente de desenvolvimento primeiro

---

## Referências de Código

Usar como base:
- `schedule.controller.ts` - Padrão de CRUD
- `appointment-reminder.job.ts` - Padrão de job de lembrete
- `shared-document.controller.ts` - Upload de documentos
- `client-message.controller.ts` - Comunicação com cliente

---

**Criado por:** Claude Code
**Para retomar:** Mencionar "PLANO_SOLICITACAO_DOCUMENTOS" na conversa
