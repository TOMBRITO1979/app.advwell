# ADVAPI v2 - Integração AdvWell

Documentação da API de monitoramento de publicações do Diário Oficial por OAB.

**Base URL:** `https://api.advtom.com`
**Autenticação:** Header `x-api-key: {ADVAPI_API_KEY}`

---

## 1. Consultar Buffer (resposta instantânea)

Retorna publicações já armazenadas no banco de dados da ADVAPI.

```
GET /api/consulta/buffer
```

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| companyId | string | Sim | ID da empresa no AdvWell |
| advogadoNome | string | Sim | Nome completo do advogado |
| dataInicio | string | Não | Data início (YYYY-MM-DD) |
| dataFim | string | Não | Data fim (YYYY-MM-DD) |

### Resposta (200)

```json
{
  "encontrado": true,
  "advogado": {
    "id": "uuid",
    "nome": "NOME DO ADVOGADO",
    "oab": "123456",
    "uf": "RJ"
  },
  "publicacoes": [
    {
      "id": "uuid",
      "numeroProcesso": "10002345620218260100",
      "siglaTribunal": "TJSP",
      "dataPublicacao": "2026-01-15",
      "dataDisponibilizacao": "2026-01-14",
      "tipoComunicacao": "Intimação",
      "textoComunicacao": "...",
      "textoLimpo": "...",
      "parteAutor": "FULANO DE TAL",
      "parteReu": "CICLANO DE TAL",
      "comarca": "São Paulo",
      "classeProcessual": "Procedimento Comum Cível"
    }
  ],
  "total": 71,
  "ultimaAtualizacao": "2026-01-19T10:00:00Z"
}
```

### Resposta quando advogado não cadastrado

```json
{
  "encontrado": false,
  "publicacoes": [],
  "total": 0,
  "message": "Advogado não encontrado no buffer"
}
```

### Exemplo cURL

```bash
curl -X GET "https://api.advtom.com/api/consulta/buffer?companyId=d719db14-5c49-4526-a851-6db07ed39f22&advogadoNome=LUCIENE%20FERREIRA&dataInicio=2021-01-01&dataFim=2026-01-19" \
  -H "x-api-key: SUA_API_KEY"
```

---

## 2. Cadastrar Advogado para Monitoramento

Cadastra um novo advogado e inicia o monitoramento automático de publicações.
A raspagem ocorre automaticamente entre 7h-21h, segunda a sábado.

```
POST /api/consulta
```

### Body (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| companyId | string | Sim | ID da empresa no AdvWell |
| advogadoNome | string | Sim | Nome completo do advogado |
| oab | string | Não | Número da OAB |
| uf | string | Não | UF da OAB (ex: RJ, SP) |

### Request

```json
{
  "companyId": "d719db14-5c49-4526-a851-6db07ed39f22",
  "advogadoNome": "LUCIENE FERREIRA",
  "oab": "92765",
  "uf": "RJ"
}
```

### Resposta (200)

```json
{
  "message": "Advogado cadastrado para monitoramento",
  "jobIds": ["uuid-do-job"],
  "advogados": 1
}
```

### Exemplo cURL

```bash
curl -X POST https://api.advtom.com/api/consulta \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -d '{
    "companyId": "d719db14-5c49-4526-a851-6db07ed39f22",
    "advogadoNome": "LUCIENE FERREIRA",
    "oab": "92765",
    "uf": "RJ"
  }'
```

---

## 3. Listar Advogados Cadastrados

Lista todos os advogados cadastrados para uma empresa.

```
GET /api/advogados
```

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| companyId | string | Sim | ID da empresa no AdvWell |

### Resposta (200)

```json
{
  "advogados": [
    {
      "id": "uuid",
      "nome": "LUCIENE FERREIRA",
      "oab": "92765",
      "uf": "RJ"
    },
    {
      "id": "uuid",
      "nome": "JOSE ORISVALDO BRITO DA SILVA",
      "oab": "57069",
      "uf": "RJ"
    }
  ],
  "total": 2
}
```

### Exemplo cURL

```bash
curl -X GET "https://api.advtom.com/api/advogados?companyId=d719db14-5c49-4526-a851-6db07ed39f22" \
  -H "x-api-key: SUA_API_KEY"
```

---

## 4. Health Check

Verifica se a API está disponível.

```
GET /health
```

### Resposta (200)

```json
{
  "status": "healthy",
  "timestamp": "2026-01-19T10:00:00Z"
}
```

---

## 5. Webhook (ADVAPI → AdvWell)

A ADVAPI envia notificações para o AdvWell quando novas publicações são encontradas.

**Endpoint AdvWell:** `POST https://api.advwell.pro/api/advapi-webhook`
**Autenticação:** Header `X-API-Key: {ADVAPI_WEBHOOK_KEY}`

### Formato v2 - Nova Publicação (uma por vez)

```json
{
  "tipo": "nova_publicacao",
  "companyId": "d719db14-5c49-4526-a851-6db07ed39f22",
  "advogadoNome": "LUCIENE FERREIRA",
  "advogadoId": "uuid-do-advogado",
  "publicacao": {
    "numeroProcesso": "10002345620218260100",
    "siglaTribunal": "TJSP",
    "dataPublicacao": "2026-01-15",
    "tipoComunicacao": "Intimação",
    "textoComunicacao": "Texto completo da publicação..."
  }
}
```

### Formato Legado - Batch (múltiplas publicações)

```json
{
  "consultaId": "uuid-da-consulta",
  "status": "completed",
  "companyId": "d719db14-5c49-4526-a851-6db07ed39f22",
  "advogadoOab": "92765",
  "ufOab": "RJ",
  "publicacoes": [
    {
      "numeroProcesso": "10002345620218260100",
      "siglaTribunal": "TJSP",
      "dataPublicacao": "2026-01-15",
      "tipoComunicacao": "Intimação",
      "textoComunicacao": "..."
    }
  ]
}
```

### Status possíveis no callback

| Status | Descrição |
|--------|-----------|
| `completed` | Consulta concluída com sucesso |
| `failed` | Consulta falhou |
| `processing` | Consulta em andamento (progresso) |

### Callback de Erro

```json
{
  "consultaId": "uuid",
  "status": "failed",
  "companyId": "empresa-id",
  "errorMessage": "Descrição do erro"
}
```

### Callback de Progresso

```json
{
  "consultaId": "uuid",
  "status": "processing",
  "progress": 50,
  "processedCount": 500,
  "totalCount": 1000
}
```

---

## Fluxo de Integração

```
┌─────────────────┐      ┌─────────────────┐
│    AdvWell      │      │     ADVAPI      │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │  1. GET /buffer        │
         │───────────────────────>│
         │                        │
         │  encontrado: false     │
         │<───────────────────────│
         │                        │
         │  2. POST /consulta     │
         │  (cadastrar advogado)  │
         │───────────────────────>│
         │                        │
         │  cadastrado: true      │
         │<───────────────────────│
         │                        │
         │  ... aguarda raspagem  │
         │     (7h-21h, seg-sáb)  │
         │                        │
         │  3. Webhook            │
         │  (nova publicação)     │
         │<───────────────────────│
         │                        │
         │  4. GET /buffer        │
         │───────────────────────>│
         │                        │
         │  publicações: [...]    │
         │<───────────────────────│
         │                        │
```

---

## Configuração no AdvWell

### Variáveis de Ambiente

```env
# URL base da ADVAPI
ADVAPI_BASE_URL=https://api.advtom.com

# API Key para autenticação nas requisições
ADVAPI_API_KEY=advapi_sk_xxxxxxxxxxxxx

# Key para validar webhooks recebidos
ADVAPI_WEBHOOK_KEY=webhook_key_xxxxxxxxxxxxx
```

### Arquivos Relevantes

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/services/advapi.service.ts` | Cliente HTTP para ADVAPI |
| `backend/src/routes/advapi-webhook.routes.ts` | Endpoint do webhook |
| `backend/src/queues/monitoring.queue.ts` | Queue de processamento |
| `backend/src/controllers/monitoring.controller.ts` | Controller de monitoramento |

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Requisição inválida (campos obrigatórios ausentes) |
| 401 | API Key inválida ou ausente |
| 404 | Recurso não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## Notas Importantes

1. **Raspagem automática:** A ADVAPI processa publicações entre 7h-21h, segunda a sábado
2. **Buffer persistente:** Publicações ficam armazenadas no buffer da ADVAPI
3. **Deduplicação:** O AdvWell evita duplicatas usando `companyId + monitoredOabId + numeroProcesso`
4. **Auto-import:** Se configurado, publicações são automaticamente convertidas em processos

---

*Última atualização: 2026-01-19*
