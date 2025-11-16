# 📁 Planejamento - Funcionalidade de Documentos

**Data:** 02/11/2025
**Versão Planejada:** v3-documents
**Status:** Em Planejamento

---

## 🎯 Objetivo

Criar uma aba "Documentos" no sistema que permita gerenciar documentos relacionados a processos/clientes, com suporte para diferentes formas de armazenamento (local, Google Drive, Minio, Google Docs).

---

## 📋 Requisitos Funcionais

### 1. **Adicionar Documento**
- **Trigger:** Botão "+ Adicionar Documento"
- **Inputs:**
  - Busca por nome do cliente OU número do processo
  - Nome do documento
  - Tipo de armazenamento:
    - Upload direto (AWS S3)
    - Link externo (Google Drive, Minio, Google Docs, etc.)
- **Validações:**
  - Cliente/Processo deve existir
  - Nome do documento obrigatório
  - Se upload: tamanho máximo 50MB
  - Se link: URL válida

### 2. **Visualizar Documentos**
- **Trigger:** Botão "Visualizar Documentos"
- **Inputs:**
  - Busca por nome do cliente OU número do processo
- **Output:**
  - Lista de todos os documentos relacionados
  - Para cada documento:
    - Nome
    - Data de criação
    - Tipo (uploaded / link)
    - Botão "Abrir"
    - Botão "Excluir"

---

## 🗃️ Estrutura de Dados

### Tabela: `documents`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Relacionamentos (um dos dois é obrigatório)
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Dados do documento
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Tipo de armazenamento
  storage_type VARCHAR(20) NOT NULL CHECK (storage_type IN ('upload', 'link')),

  -- Para documentos carregados (storage_type = 'upload')
  file_url TEXT, -- URL no S3
  file_key TEXT, -- Key no S3
  file_size INTEGER, -- Tamanho em bytes
  file_type VARCHAR(100), -- MIME type

  -- Para links externos (storage_type = 'link')
  external_url TEXT,
  external_type VARCHAR(50), -- 'google_drive', 'google_docs', 'minio', 'other'

  -- Metadados
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT check_case_or_client CHECK (
    (case_id IS NOT NULL AND client_id IS NULL) OR
    (case_id IS NULL AND client_id IS NOT NULL)
  ),
  CONSTRAINT check_storage_fields CHECK (
    (storage_type = 'upload' AND file_url IS NOT NULL) OR
    (storage_type = 'link' AND external_url IS NOT NULL)
  )
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
```

### Schema Prisma

```prisma
enum StorageType {
  upload
  link
}

enum ExternalType {
  google_drive
  google_docs
  minio
  other
}

model Document {
  id          String       @id @default(uuid())
  companyId   String

  // Relationships
  caseId      String?
  clientId    String?

  // Document data
  name        String
  description String?

  // Storage
  storageType StorageType

  // For uploads
  fileUrl     String?
  fileKey     String?
  fileSize    Int?
  fileType    String?

  // For links
  externalUrl  String?
  externalType ExternalType?

  // Metadata
  uploadedBy  String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  case        Case?       @relation(fields: [caseId], references: [id], onDelete: Cascade)
  client      Client?     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user        User?       @relation(fields: [uploadedBy], references: [id], onDelete: SetNull)

  @@map("documents")
}
```

---

## 🎨 Interface (Frontend)

### Nova Rota: `/documents`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ DOCUMENTOS                               [+ Adicionar]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Buscar por Cliente ou Processo]  [🔍 Buscar]         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📄 Contrato Social - Empresa XYZ                │   │
│  │ Cliente: Empresa XYZ Ltda                       │   │
│  │ Adicionado em: 15/03/2024 por João Silva       │   │
│  │ [Abrir] [Excluir]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📄 Procuração                                    │   │
│  │ Processo: 00249252420208190206                  │   │
│  │ Link: Google Drive                              │   │
│  │ Adicionado em: 10/03/2024 por Maria Souza      │   │
│  │ [Abrir] [Excluir]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Modal: "Adicionar Documento"

```
┌───────────────────────────────────────────────┐
│ Adicionar Documento                      [X]  │
├───────────────────────────────────────────────┤
│                                                │
│ Buscar Cliente/Processo *                     │
│ [____________________________________]  [🔍]  │
│ (Digite nome do cliente ou nº processo)       │
│                                                │
│ Selecionado: ✓ João da Silva Santos          │
│                                                │
│ Nome do Documento *                           │
│ [____________________________________]        │
│                                                │
│ Descrição (opcional)                          │
│ [____________________________________]        │
│ [____________________________________]        │
│                                                │
│ Tipo de Armazenamento:                        │
│ ( ) Carregar Arquivo                          │
│ (●) Link Externo                              │
│                                                │
│ ┌─ Se "Link Externo" ─────────────────┐      │
│ │ URL do Documento *                   │      │
│ │ [________________________________]   │      │
│ │                                      │      │
│ │ Tipo:                                │      │
│ │ [▼ Google Drive]                     │      │
│ │    - Google Drive                    │      │
│ │    - Google Docs                     │      │
│ │    - Minio                           │      │
│ │    - Outro                           │      │
│ └──────────────────────────────────────┘      │
│                                                │
│ ┌─ Se "Carregar Arquivo" ──────────────┐      │
│ │ [Selecionar Arquivo]                 │      │
│ │ 📄 contrato.pdf (2.5 MB)             │      │
│ │ Máximo: 50MB                         │      │
│ └──────────────────────────────────────┘      │
│                                                │
│           [Cancelar]  [Salvar Documento]      │
└───────────────────────────────────────────────┘
```

### Modal: "Visualizar Documentos"

```
┌───────────────────────────────────────────────┐
│ Documentos - João da Silva Santos       [X]  │
├───────────────────────────────────────────────┤
│                                                │
│ Cliente: João da Silva Santos                 │
│ CPF: 123.456.789-00                           │
│                                                │
│ ┌── Documentos (3) ────────────────────────┐ │
│ │                                           │ │
│ │ 📄 Contrato de Honorários                │ │
│ │ Tipo: Upload | 15/03/2024                │ │
│ │ Tamanho: 1.2 MB                          │ │
│ │ [Abrir] [Excluir]                        │ │
│ │ ──────────────────────────────────────── │ │
│ │ 🔗 Procuração - Google Drive             │ │
│ │ Tipo: Link | 10/03/2024                  │ │
│ │ [Abrir] [Excluir]                        │ │
│ │ ──────────────────────────────────────── │ │
│ │ 📄 RG e CPF                              │ │
│ │ Tipo: Upload | 05/03/2024                │ │
│ │ Tamanho: 850 KB                          │ │
│ │ [Abrir] [Excluir]                        │ │
│ │                                           │ │
│ └───────────────────────────────────────────┘ │
│                                                │
│                              [Fechar]          │
└───────────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

### Backend Routes: `/api/documents`

```typescript
POST   /api/documents              // Criar documento
GET    /api/documents              // Listar documentos (com filtros)
GET    /api/documents/:id          // Buscar documento específico
PUT    /api/documents/:id          // Atualizar documento
DELETE /api/documents/:id          // Excluir documento
POST   /api/documents/upload       // Upload de arquivo
GET    /api/documents/search       // Buscar por cliente/processo
```

### Query Parameters para GET /api/documents:
- `?caseId=xxx` - Filtrar por processo
- `?clientId=xxx` - Filtrar por cliente
- `?search=xxx` - Buscar por nome
- `?storageType=upload|link` - Filtrar por tipo
- `?page=1&limit=20` - Paginação

---

## 🛠️ Implementação

### Fase 1: Backend
1. ✅ Atualizar schema Prisma
2. ✅ Criar migration
3. ✅ Criar controller `document.controller.ts`
4. ✅ Criar routes `document.routes.ts`
5. ✅ Implementar upload de arquivos (S3)
6. ✅ Middleware de autenticação e tenant

### Fase 2: Frontend
1. ✅ Criar página `Documents.tsx`
2. ✅ Implementar modal "Adicionar Documento"
3. ✅ Implementar busca por cliente/processo
4. ✅ Implementar visualização de documentos
5. ✅ Implementar upload de arquivos
6. ✅ Implementar abertura de documentos

### Fase 3: Testes e Deploy
1. ✅ Testar upload de arquivo
2. ✅ Testar link externo
3. ✅ Testar busca e visualização
4. ✅ Testar exclusão
5. ✅ Build e deploy

---

## 📊 Casos de Uso

### Caso 1: Upload de Documento
```
1. Usuário clica em "+ Adicionar Documento"
2. Busca por "João da Silva"
3. Seleciona o cliente encontrado
4. Digite "RG e CPF"
5. Seleciona "Carregar Arquivo"
6. Escolhe arquivo RG_CPF.pdf (2MB)
7. Clica "Salvar Documento"
8. Sistema:
   - Valida arquivo
   - Faz upload para S3
   - Salva registro no banco
   - Mostra mensagem de sucesso
```

### Caso 2: Link Externo (Google Drive)
```
1. Usuário clica em "+ Adicionar Documento"
2. Busca por "00249252420208190206"
3. Seleciona o processo encontrado
4. Digite "Procuração"
5. Seleciona "Link Externo"
6. Cola URL do Google Drive
7. Seleciona tipo "Google Drive"
8. Clica "Salvar Documento"
9. Sistema salva registro com link
```

### Caso 3: Visualizar Documentos
```
1. Usuário clica em "Visualizar Documentos"
2. Busca por "João da Silva"
3. Sistema mostra lista de 3 documentos
4. Usuário clica em "Abrir" no primeiro
5. Sistema:
   - Se upload: gera URL assinada do S3
   - Se link: redireciona para URL externa
```

---

## 🔒 Segurança

1. **Autenticação:** Todos os endpoints requerem JWT válido
2. **Tenant Isolation:** Usuário só vê documentos da sua empresa
3. **Validação de Arquivo:**
   - Tamanho máximo: 50MB
   - Tipos permitidos: PDF, DOC, DOCX, JPG, PNG, etc.
   - Scan de vírus (futuro)
4. **URLs Assinadas:** Links S3 com expiração de 1 hora
5. **Permissões:**
   - USER: Pode ver e adicionar
   - ADMIN: Pode ver, adicionar e excluir
   - SUPER_ADMIN: Acesso total

---

## 📝 Notas Técnicas

### Reuso de Funcionalidade Existente
- O sistema JÁ tem `CaseDocument` para documentos de processos
- **Decisão:** Criar nova tabela `documents` mais genérica
- **Migração:** Manter `case_documents` para compatibilidade

### Upload de Arquivos
- Usar middleware `multer` existente
- Aproveitar funções S3 de `backend/src/utils/s3.ts`
- Limite: 50MB por arquivo

### Busca de Cliente/Processo
- Autocomplete similar ao usado em Financial e Cases
- Buscar por: nome do cliente, CPF, número do processo
- Mostrar resultado formatado

---

## ✅ Checklist de Implementação

### Backend
- [ ] Atualizar `schema.prisma` com model Document
- [ ] Criar migration `add_documents_table.sql`
- [ ] Gerar Prisma client
- [ ] Criar `document.controller.ts`
- [ ] Criar `document.routes.ts`
- [ ] Registrar rotas em `routes/index.ts`
- [ ] Testar endpoints via Postman/curl

### Frontend
- [ ] Criar `Documents.tsx` em `pages/`
- [ ] Adicionar rota `/documents` em `App.tsx`
- [ ] Adicionar link no menu `Layout.tsx`
- [ ] Implementar modal "Adicionar Documento"
- [ ] Implementar busca de cliente/processo
- [ ] Implementar upload de arquivo
- [ ] Implementar visualização de documentos
- [ ] Testar todas as funcionalidades

### Deploy
- [ ] Build backend (v3-documents)
- [ ] Build frontend (v3-documents)
- [ ] Push para DockerHub
- [ ] Deploy no servidor
- [ ] Criar backup completo
- [ ] Atualizar CLAUDE.md
- [ ] Commit no GitHub

---

**Próximo Passo:** Implementar Backend (Prisma Schema + Migration)
