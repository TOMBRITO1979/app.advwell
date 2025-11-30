# Guia Completo da API de Integração - AdvWell

## Visão Geral

A API de Integração do AdvWell permite que sistemas externos (WhatsApp, Chatbots, N8N, etc.) consultem informações de clientes, processos e agendamentos de forma segura.

---

## Configuração

### Base URL
```
https://api.advwell.pro/api/integration
```

### Autenticação
Todas as requisições devem incluir o header de autenticação:
```
X-API-Key: sua-api-key-aqui
```

### Obtendo sua API Key
1. Acesse o sistema AdvWell
2. Vá em **Configurações** (menu lateral)
3. Na seção **API Key para Integrações**, clique em **Gerar API Key**
4. Copie a chave gerada

### Rate Limit
- **20 requisições** por **15 minutos** por API Key
- Ao exceder o limite, a API retorna erro 429

---

## Endpoints Disponíveis

### 1. Validar Cliente

Valida a identidade do cliente usando CPF e data de nascimento. **Use sempre antes de fornecer informações.**

**Endpoint:**
```
POST /validate-client
```

**Headers:**
```
Content-Type: application/json
X-API-Key: sua-api-key
```

**Body:**
```json
{
  "cpf": "123.456.789-00",
  "birthDate": "15/01/1990"
}
```

**Formatos aceitos:**
- CPF: `123.456.789-00` ou `12345678900`
- Data: `DD/MM/YYYY` ou `YYYY-MM-DD`

**Resposta de Sucesso (200):**
```json
{
  "valid": true,
  "clientId": "fdac657d-8cd0-4e48-b2b4-045a4feeb15d",
  "name": "João da Silva",
  "message": "Cliente validado com sucesso"
}
```

**Resposta de Erro - Cliente não encontrado (200):**
```json
{
  "valid": false,
  "message": "Cliente não encontrado ou dados não conferem"
}
```

**Resposta de Erro - Dados faltando (400):**
```json
{
  "error": "CPF e data de nascimento são obrigatórios"
}
```

**Exemplo cURL:**
```bash
curl -X POST "https://api.advwell.pro/api/integration/validate-client" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key" \
  -d '{
    "cpf": "123.456.789-00",
    "birthDate": "15/01/1990"
  }'
```

---

### 2. Listar Processos do Cliente

Retorna todos os processos judiciais de um cliente validado.

**Endpoint:**
```
GET /client/{clientId}/cases
```

**Headers:**
```
X-API-Key: sua-api-key
```

**Parâmetros de URL:**
- `clientId` (obrigatório): ID do cliente retornado na validação

**Resposta de Sucesso (200):**
```json
{
  "clientName": "João da Silva",
  "totalCases": 2,
  "cases": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "processNumber": "0001234-56.2024.8.19.0001",
      "subject": "Ação de Indenização por Danos Morais",
      "status": "ACTIVE",
      "court": "TJRJ",
      "instance": "1ª Vara Cível",
      "informarCliente": "Seu processo está em fase de instrução. Aguardamos a data da audiência.",
      "lastMovementDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2023-06-20T14:00:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "processNumber": "0005678-90.2024.8.19.0001",
      "subject": "Ação Trabalhista",
      "status": "ACTIVE",
      "court": "TRT",
      "instance": "2ª Vara do Trabalho",
      "informarCliente": "Processo concluído. Aguardando pagamento do réu.",
      "lastMovementDate": "2024-02-10T15:45:00.000Z",
      "createdAt": "2023-08-15T09:30:00.000Z"
    }
  ]
}
```

**Campos importantes:**
- `informarCliente`: Texto escrito pelo advogado especificamente para ser comunicado ao cliente. **Use este campo como resposta principal.**
- `status`: PENDING, ACTIVE, ARCHIVED, FINISHED

**Resposta de Erro - Cliente não encontrado (404):**
```json
{
  "error": "Cliente não encontrado",
  "message": "Cliente não encontrado ou não pertence a esta empresa"
}
```

**Exemplo cURL:**
```bash
curl "https://api.advwell.pro/api/integration/client/fdac657d-8cd0-4e48-b2b4-045a4feeb15d/cases" \
  -H "X-API-Key: sua-api-key"
```

---

### 3. Obter Andamento do Processo

Retorna detalhes completos de um processo específico, incluindo movimentações.

**Endpoint:**
```
GET /client/{clientId}/case/{caseId}/movements
```

**Headers:**
```
X-API-Key: sua-api-key
```

**Parâmetros de URL:**
- `clientId` (obrigatório): ID do cliente
- `caseId` (obrigatório): ID do processo

**Resposta de Sucesso (200):**
```json
{
  "processNumber": "0001234-56.2024.8.19.0001",
  "subject": "Ação de Indenização por Danos Morais",
  "informarCliente": "Seu processo está em fase de instrução. A próxima audiência está marcada para 20/03/2024 às 14h. Compareça com 30 minutos de antecedência.",
  "ultimoAndamento": "Juntada de petição de manifestação sobre documentos",
  "totalMovements": 5,
  "movements": [
    {
      "date": "2024-01-15T10:30:00.000Z",
      "name": "Juntada de Petição",
      "description": "Juntada de petição de manifestação sobre documentos apresentados pela parte contrária"
    },
    {
      "date": "2024-01-10T09:00:00.000Z",
      "name": "Conclusão ao Juiz",
      "description": "Autos conclusos ao juiz para decisão"
    },
    {
      "date": "2024-01-05T14:20:00.000Z",
      "name": "Intimação Eletrônica",
      "description": "Intimação da parte autora para manifestação"
    }
  ]
}
```

**Campo principal para resposta ao cliente:**
- `informarCliente`: Texto preparado pelo advogado com a informação que deve ser passada ao cliente

**Resposta de Erro - Processo não encontrado (404):**
```json
{
  "error": "Processo não encontrado",
  "message": "Processo não encontrado ou não pertence a este cliente"
}
```

**Exemplo cURL:**
```bash
curl "https://api.advwell.pro/api/integration/client/fdac657d-8cd0-4e48-b2b4-045a4feeb15d/case/a1b2c3d4-e5f6-7890-abcd-ef1234567890/movements" \
  -H "X-API-Key: sua-api-key"
```

---

### 4. Consultar Agenda do Cliente

Retorna próximas audiências, compromissos e prazos do cliente.

**Endpoint:**
```
GET /client/{clientId}/schedule
```

**Headers:**
```
X-API-Key: sua-api-key
```

**Parâmetros de URL:**
- `clientId` (obrigatório): ID do cliente

**Resposta de Sucesso (200):**
```json
{
  "clientName": "João da Silva",
  "upcomingEvents": [
    {
      "id": "d740ca19-a1cd-4e4a-bedc-18d103f25cea",
      "title": "Audiência de Instrução e Julgamento",
      "description": "Comparecer com documentos originais e testemunhas",
      "type": "AUDIENCIA",
      "typeName": "Audiência",
      "priority": "ALTA",
      "date": "2024-03-20T14:00:00.000Z",
      "endDate": "2024-03-20T16:00:00.000Z",
      "processNumber": "0001234-56.2024.8.19.0001",
      "caseSubject": "Ação de Indenização por Danos Morais"
    },
    {
      "id": "e851db20-b2de-5b5b-cedc-29e214f36dfb",
      "title": "Reunião com Advogado",
      "description": "Preparação para audiência",
      "type": "COMPROMISSO",
      "typeName": "Compromisso",
      "priority": "MEDIA",
      "date": "2024-03-18T10:00:00.000Z",
      "endDate": null,
      "processNumber": null,
      "caseSubject": null
    }
  ],
  "caseDeadlines": [
    {
      "processNumber": "0005678-90.2024.8.19.0001",
      "subject": "Ação Trabalhista",
      "deadline": "2024-03-25T23:59:59.000Z"
    }
  ]
}
```

**Tipos de evento:**
- `AUDIENCIA`: Audiência judicial
- `COMPROMISSO`: Compromisso geral
- `TAREFA`: Tarefa interna
- `PRAZO`: Prazo processual
- `GOOGLE_MEET`: Reunião online

**Níveis de prioridade:**
- `BAIXA`: Prioridade baixa
- `MEDIA`: Prioridade média
- `ALTA`: Prioridade alta
- `URGENTE`: Urgente

**Resposta de Erro - Cliente não encontrado (404):**
```json
{
  "error": "Cliente não encontrado",
  "message": "Cliente não encontrado ou não pertence a esta empresa"
}
```

**Exemplo cURL:**
```bash
curl "https://api.advwell.pro/api/integration/client/fdac657d-8cd0-4e48-b2b4-045a4feeb15d/schedule" \
  -H "X-API-Key: sua-api-key"
```

---

## Fluxo Completo de Atendimento

### Passo 1: Validar Identidade
```
Cliente: "Quero saber do meu processo"
Bot: "Para sua segurança, informe seu CPF e data de nascimento"
Cliente: "123.456.789-00, nascido em 15/01/1990"

→ POST /validate-client
← { "valid": true, "clientId": "xxx", "name": "João" }

Bot: "Olá João! Identidade confirmada."
```

### Passo 2: Listar Processos
```
Bot: "Vou verificar seus processos..."

→ GET /client/xxx/cases
← { "totalCases": 2, "cases": [...] }

Bot: "Você tem 2 processos:
1. Ação de Indenização (0001234-56.2024.8.19.0001)
2. Ação Trabalhista (0005678-90.2024.8.19.0001)
Qual deseja consultar?"
```

### Passo 3: Consultar Andamento
```
Cliente: "O primeiro"

→ GET /client/xxx/case/yyy/movements
← { "informarCliente": "Seu processo está em fase de instrução..." }

Bot: "Sobre o processo 0001234-56.2024.8.19.0001:
Seu processo está em fase de instrução. A próxima audiência está marcada para 20/03/2024 às 14h."
```

### Passo 4: Verificar Audiências
```
Cliente: "Tenho alguma audiência marcada?"

→ GET /client/xxx/schedule
← { "upcomingEvents": [...] }

Bot: "Sim! Você tem uma audiência agendada:
📅 20/03/2024 às 14:00
Tipo: Audiência de Instrução e Julgamento
Processo: 0001234-56.2024.8.19.0001
Compareça com 30 minutos de antecedência."
```

---

## Códigos de Erro

| Código | Significado | Causa |
|--------|-------------|-------|
| 400 | Bad Request | Parâmetros obrigatórios faltando |
| 401 | Unauthorized | API Key inválida ou não fornecida |
| 404 | Not Found | Cliente ou processo não encontrado |
| 429 | Too Many Requests | Rate limit excedido (20 req/15min) |
| 500 | Internal Server Error | Erro interno do servidor |

---

## Boas Práticas

### Segurança
1. **Sempre valide o cliente** antes de fornecer qualquer informação
2. **Nunca exponha a API Key** em código frontend ou logs públicos
3. **Use HTTPS** em todas as requisições

### Performance
1. **Cache o clientId** após validação bem-sucedida (durante a sessão)
2. **Não faça requisições desnecessárias** - use os dados já obtidos
3. **Respeite o rate limit** de 20 requisições por 15 minutos

### Experiência do Usuário
1. Use o campo `informarCliente` como resposta principal - ele foi escrito pelo advogado especificamente para o cliente
2. Formate datas para o padrão brasileiro (DD/MM/YYYY)
3. Formate horários no formato 24h (HH:MM)
4. Ofereça opções claras quando houver múltiplos processos

---

## Exemplo Completo em JavaScript

```javascript
const API_BASE = 'https://api.advwell.pro/api/integration';
const API_KEY = 'sua-api-key-aqui';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

// 1. Validar cliente
async function validateClient(cpf, birthDate) {
  const response = await fetch(`${API_BASE}/validate-client`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cpf, birthDate })
  });
  return response.json();
}

// 2. Listar processos
async function getClientCases(clientId) {
  const response = await fetch(`${API_BASE}/client/${clientId}/cases`, {
    headers
  });
  return response.json();
}

// 3. Obter andamento
async function getCaseMovements(clientId, caseId) {
  const response = await fetch(`${API_BASE}/client/${clientId}/case/${caseId}/movements`, {
    headers
  });
  return response.json();
}

// 4. Consultar agenda
async function getClientSchedule(clientId) {
  const response = await fetch(`${API_BASE}/client/${clientId}/schedule`, {
    headers
  });
  return response.json();
}

// Exemplo de uso
async function handleClientQuery(cpf, birthDate) {
  // Validar
  const validation = await validateClient(cpf, birthDate);
  if (!validation.valid) {
    return 'Não foi possível validar seus dados.';
  }

  const clientId = validation.clientId;

  // Buscar processos
  const cases = await getClientCases(clientId);
  if (cases.totalCases === 0) {
    return 'Você não possui processos ativos.';
  }

  // Buscar agenda
  const schedule = await getClientSchedule(clientId);

  return {
    cliente: validation.name,
    processos: cases.cases,
    proximosEventos: schedule.upcomingEvents
  };
}
```

---

## Exemplo Completo em Python

```python
import requests

API_BASE = 'https://api.advwell.pro/api/integration'
API_KEY = 'sua-api-key-aqui'

headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
}

def validate_client(cpf, birth_date):
    """Valida cliente por CPF e data de nascimento"""
    response = requests.post(
        f'{API_BASE}/validate-client',
        headers=headers,
        json={'cpf': cpf, 'birthDate': birth_date}
    )
    return response.json()

def get_client_cases(client_id):
    """Lista processos do cliente"""
    response = requests.get(
        f'{API_BASE}/client/{client_id}/cases',
        headers=headers
    )
    return response.json()

def get_case_movements(client_id, case_id):
    """Obtém andamento de um processo"""
    response = requests.get(
        f'{API_BASE}/client/{client_id}/case/{case_id}/movements',
        headers=headers
    )
    return response.json()

def get_client_schedule(client_id):
    """Consulta agenda do cliente"""
    response = requests.get(
        f'{API_BASE}/client/{client_id}/schedule',
        headers=headers
    )
    return response.json()

# Exemplo de uso
if __name__ == '__main__':
    # Validar cliente
    result = validate_client('123.456.789-00', '15/01/1990')

    if result.get('valid'):
        client_id = result['clientId']
        print(f"Cliente validado: {result['name']}")

        # Buscar processos
        cases = get_client_cases(client_id)
        print(f"Total de processos: {cases['totalCases']}")

        for case in cases['cases']:
            print(f"- {case['processNumber']}: {case['subject']}")
            print(f"  Info: {case['informarCliente']}")

        # Buscar agenda
        schedule = get_client_schedule(client_id)
        print(f"\nPróximos eventos: {len(schedule['upcomingEvents'])}")

        for event in schedule['upcomingEvents']:
            print(f"- {event['date']}: {event['title']} ({event['typeName']})")
    else:
        print("Cliente não encontrado")
```

---

## Suporte

Em caso de dúvidas ou problemas:
- Verifique se a API Key está correta
- Confirme que está usando HTTPS
- Verifique os logs de erro retornados pela API
- Entre em contato com o suporte técnico

---

*Documentação atualizada em: Novembro 2025*
*Versão da API: v1.0*
