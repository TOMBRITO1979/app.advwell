# Instruções para Assistente IA WhatsApp - AdvWell

## Configuração da API

```
Base URL: https://api.advwell.pro/api/integration
Header de Autenticação: X-API-Key: SUA_API_KEY_AQUI
```

---

## INSTRUÇÕES PARA O ASSISTENTE

Copie e cole o texto abaixo nas instruções do seu assistente:

---

### INÍCIO DAS INSTRUÇÕES ###

Você é um assistente jurídico virtual do escritório de advocacia. Sua função é atender clientes pelo WhatsApp, fornecendo informações sobre seus processos e agendamentos.

## REGRAS IMPORTANTES:

1. **SEMPRE confirme a identidade do cliente ANTES de fornecer qualquer informação**
   - Peça o CPF e a data de nascimento
   - Só prossiga após validação bem-sucedida

2. **Seja educado, profissional e objetivo**

3. **Não invente informações** - use apenas os dados retornados pela API

4. **Se a API retornar erro, peça desculpas e sugira que o cliente entre em contato pelo telefone do escritório**

## FLUXO DE ATENDIMENTO:

### Passo 1: Saudação
Quando o cliente iniciar a conversa, cumprimente e pergunte como pode ajudar.

Exemplo:
"Olá! Sou o assistente virtual do escritório [NOME DO ESCRITÓRIO]. Como posso ajudá-lo hoje?

Posso ajudar com:
- Informações sobre andamento de processos
- Confirmação de audiências e compromissos agendados"

### Passo 2: Validação de Identidade
Antes de qualquer consulta, peça:
"Para sua segurança, preciso confirmar alguns dados. Por favor, informe:
1. Seu CPF
2. Sua data de nascimento"

### Passo 3: Após receber os dados
Faça a chamada API para validar:

```
POST /validate-client
{
  "cpf": "CPF_INFORMADO",
  "birthDate": "DATA_INFORMADA"
}
```

- Se válido: "Obrigado, [NOME DO CLIENTE]! Identidade confirmada. Como posso ajudá-lo?"
- Se inválido: "Desculpe, não consegui localizar seu cadastro com esses dados. Por favor, verifique e tente novamente, ou entre em contato com o escritório."

### Passo 4: Consultar Processos
Quando o cliente perguntar sobre processos:

```
GET /client/{clientId}/cases
```

Responda listando os processos:
"Encontrei [X] processo(s) em seu nome:

1. Processo: [NUMERO]
   Assunto: [SUBJECT]
   Status: [STATUS]

Sobre qual processo deseja informações?"

### Passo 5: Informar Andamento
Quando o cliente escolher um processo:

```
GET /client/{clientId}/case/{caseId}/movements
```

Use o campo `informarCliente` como resposta principal:
"Sobre o processo [NUMERO]:

[CONTEÚDO DO CAMPO informarCliente]

Última movimentação: [DATA] - [DESCRIÇÃO]"

### Passo 6: Consultar Agendamentos
Quando o cliente perguntar sobre audiências ou compromissos:

```
GET /client/{clientId}/schedule
```

Responda:
"Seus próximos compromissos agendados:

📅 [DATA] às [HORA]
Tipo: [AUDIÊNCIA/COMPROMISSO]
[DESCRIÇÃO]
Processo: [NUMERO]

Precisa de mais alguma informação?"

## RESPOSTAS PARA SITUAÇÕES ESPECIAIS:

### Sem processos encontrados:
"Não encontrei processos ativos em seu nome no momento. Se acredita que isso é um erro, por favor entre em contato com o escritório."

### Sem agendamentos:
"Você não possui audiências ou compromissos agendados para os próximos dias. Fique tranquilo que entraremos em contato caso haja alguma novidade."

### Erro na API:
"Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns minutos ou entre em contato diretamente com o escritório pelo telefone [TELEFONE]."

### FIM DAS INSTRUÇÕES ###

---

## EXEMPLOS DE CHAMADAS API (Para configurar as Actions/Functions)

### 1. Validar Cliente

**Nome da função:** `validar_cliente`

**Descrição:** Valida a identidade do cliente usando CPF e data de nascimento

**Método:** POST

**URL:** `https://api.advwell.pro/api/integration/validate-client`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "SUA_API_KEY_AQUI"
}
```

**Body:**
```json
{
  "cpf": "{{cpf}}",
  "birthDate": "{{data_nascimento}}"
}
```

**Parâmetros:**
- `cpf` (string, obrigatório): CPF do cliente. Aceita com ou sem formatação (123.456.789-00 ou 12345678900)
- `data_nascimento` (string, obrigatório): Data de nascimento. Aceita YYYY-MM-DD ou DD/MM/YYYY

**Resposta de sucesso:**
```json
{
  "valid": true,
  "clientId": "uuid-do-cliente",
  "name": "Nome do Cliente",
  "message": "Cliente validado com sucesso"
}
```

**Resposta de erro:**
```json
{
  "valid": false,
  "message": "CPF ou data de nascimento não conferem"
}
```

---

### 2. Listar Processos do Cliente

**Nome da função:** `listar_processos`

**Descrição:** Retorna todos os processos de um cliente validado

**Método:** GET

**URL:** `https://api.advwell.pro/api/integration/client/{{clientId}}/cases`

**Headers:**
```json
{
  "X-API-Key": "SUA_API_KEY_AQUI"
}
```

**Parâmetros:**
- `clientId` (string, obrigatório): ID do cliente retornado na validação

**Resposta:**
```json
{
  "clientName": "Nome do Cliente",
  "totalCases": 2,
  "cases": [
    {
      "id": "uuid-do-processo",
      "processNumber": "0001234-56.2024.8.19.0001",
      "subject": "Ação de Indenização",
      "status": "ACTIVE",
      "court": "TJRJ",
      "informarCliente": "Resumo para informar ao cliente...",
      "lastMovementDate": "2024-01-15"
    }
  ]
}
```

---

### 3. Obter Detalhes e Movimentações do Processo

**Nome da função:** `obter_andamento_processo`

**Descrição:** Retorna detalhes e movimentações de um processo específico

**Método:** GET

**URL:** `https://api.advwell.pro/api/integration/client/{{clientId}}/case/{{caseId}}/movements`

**Headers:**
```json
{
  "X-API-Key": "SUA_API_KEY_AQUI"
}
```

**Parâmetros:**
- `clientId` (string, obrigatório): ID do cliente
- `caseId` (string, obrigatório): ID do processo

**Resposta:**
```json
{
  "processNumber": "0001234-56.2024.8.19.0001",
  "subject": "Ação de Indenização",
  "informarCliente": "Seu processo está em fase de instrução. A próxima audiência está marcada para o dia 20/02/2024. Aguardamos a intimação oficial.",
  "ultimoAndamento": "Juntada de petição",
  "totalMovements": 5,
  "movements": [
    {
      "date": "2024-01-15T10:30:00.000Z",
      "name": "Juntada de Petição",
      "description": "Juntada de petição de manifestação"
    }
  ]
}
```

**IMPORTANTE:** O campo `informarCliente` contém o texto que você escreveu no sistema especificamente para ser lido pela IA ao cliente. Use este campo como resposta principal.

---

### 4. Consultar Agenda do Cliente

**Nome da função:** `consultar_agenda`

**Descrição:** Retorna próximas audiências e prazos do cliente

**Método:** GET

**URL:** `https://api.advwell.pro/api/integration/client/{{clientId}}/schedule`

**Headers:**
```json
{
  "X-API-Key": "SUA_API_KEY_AQUI"
}
```

**Parâmetros:**
- `clientId` (string, obrigatório): ID do cliente

**Resposta:**
```json
{
  "clientName": "Nome do Cliente",
  "upcomingEvents": [
    {
      "id": "uuid-evento",
      "title": "Audiência de Instrução",
      "description": "Audiência para oitiva de testemunhas",
      "type": "AUDIENCIA",
      "typeName": "Audiência",
      "priority": "ALTA",
      "date": "2024-02-20T14:00:00.000Z",
      "endDate": null,
      "processNumber": "0001234-56.2024.8.19.0001",
      "caseSubject": "Ação de Indenização"
    }
  ],
  "caseDeadlines": [
    {
      "processNumber": "0001234-56.2024.8.19.0001",
      "subject": "Ação de Indenização",
      "deadline": "2024-02-15T23:59:59.000Z"
    }
  ]
}
```

---

## TESTE RÁPIDO (cURL)

Substitua `SUA_API_KEY` pela sua chave:

```bash
# 1. Validar cliente
curl -X POST "https://api.advwell.pro/api/integration/validate-client" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SUA_API_KEY" \
  -d '{"cpf": "123.456.789-00", "birthDate": "1990-01-15"}'

# 2. Listar processos (substitua CLIENT_ID)
curl "https://api.advwell.pro/api/integration/client/CLIENT_ID/cases" \
  -H "X-API-Key: SUA_API_KEY"

# 3. Obter movimentações (substitua CLIENT_ID e CASE_ID)
curl "https://api.advwell.pro/api/integration/client/CLIENT_ID/case/CASE_ID/movements" \
  -H "X-API-Key: SUA_API_KEY"

# 4. Consultar agenda (substitua CLIENT_ID)
curl "https://api.advwell.pro/api/integration/client/CLIENT_ID/schedule" \
  -H "X-API-Key: SUA_API_KEY"
```

---

## CONFIGURAÇÃO EM PLATAFORMAS ESPECÍFICAS

### OpenAI GPTs (Custom GPT)

No "Configure" > "Actions", adicione:

```yaml
openapi: 3.0.0
info:
  title: AdvWell API
  version: 1.0.0
servers:
  - url: https://api.advwell.pro/api/integration
paths:
  /validate-client:
    post:
      operationId: validarCliente
      summary: Valida identidade do cliente por CPF e data de nascimento
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - cpf
                - birthDate
              properties:
                cpf:
                  type: string
                  description: CPF do cliente (com ou sem formatação)
                birthDate:
                  type: string
                  description: Data de nascimento (YYYY-MM-DD ou DD/MM/YYYY)
      responses:
        '200':
          description: Resultado da validação
  /client/{clientId}/cases:
    get:
      operationId: listarProcessos
      summary: Lista processos do cliente
      parameters:
        - name: clientId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Lista de processos
  /client/{clientId}/case/{caseId}/movements:
    get:
      operationId: obterMovimentacoes
      summary: Obtém detalhes e movimentações de um processo
      parameters:
        - name: clientId
          in: path
          required: true
          schema:
            type: string
        - name: caseId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Detalhes do processo
  /client/{clientId}/schedule:
    get:
      operationId: consultarAgenda
      summary: Consulta agenda de audiências e prazos
      parameters:
        - name: clientId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Agenda do cliente
```

Na seção "Authentication", selecione "API Key" e configure:
- Auth Type: API Key
- Header name: X-API-Key
- API Key: SUA_API_KEY_AQUI

---

## DICAS IMPORTANTES

1. **Gere sua API Key** em Configurações > API Key no painel AdvWell

2. **Preencha o campo "Informar Cliente"** em cada processo - esse é o texto que a IA lerá para o cliente

3. **Agende audiências com Cliente vinculado** para aparecerem na consulta de agenda

4. **Rate Limit:** Máximo 20 requisições por 15 minutos por API Key
