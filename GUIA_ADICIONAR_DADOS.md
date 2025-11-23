# 📝 GUIA: COMO ADICIONAR DADOS NO SISTEMA

**Data:** 2025-11-21

---

## ✅ API FUNCIONANDO PERFEITAMENTE

Testei criar clientes via API e **TUDO FUNCIONA**:
- ✅ Cliente com dados mínimos (apenas nome e email)
- ✅ Cliente com dados completos
- ✅ Cliente com caracteres especiais (acentos, parênteses, etc)

**Conclusão:** O problema NÃO está no backend!

---

## 🔍 DIAGNÓSTICO

Possíveis causas do erro "Dados inválidos":

### 1. **Cache do Browser**
   - Você está vendo uma versão antiga do frontend
   - Solução: Limpar cache E fechar/abrir navegador

### 2. **Campos Obrigatórios Vazios**
   - O frontend pode ter validação que não deixa enviar
   - Solução: Preencher TODOS os campos obrigatórios

### 3. **Formato de Data Incorreto**
   - Campo de data pode não aceitar formato BR
   - Solução: Deixar data em branco ou usar formato: AAAA-MM-DD

### 4. **CPF/CNPJ com Máscara**
   - Campo pode não aceitar pontos e traços
   - Solução: Digitar apenas números

---

## 📝 COMO ADICIONAR CADA TIPO DE DADO

### 👤 ADICIONAR CLIENTE

**Campos OBRIGATÓRIOS (mínimo):**
- ✅ Nome
- ✅ Email

**Campos OPCIONAIS:**
- CPF (apenas números, sem pontos/traços)
- RG
- Telefone (pode ter ou não parênteses/traços)
- Endereço
- Cidade
- Estado
- CEP
- Profissão
- Estado Civil
- Data de Nascimento (formato: AAAA-MM-DD)
- Observações
- Tag

**Exemplo de dados válidos:**
```
Nome: João da Silva
Email: joao@example.com
CPF: 12345678901 (SEM pontos/traços)
Telefone: 21987654321 OU (21) 98765-4321
Data Nascimento: 1980-05-15 (ou deixe vazio)
```

---

### ⚖️ ADICIONAR PROCESSO

**Campos OBRIGATÓRIOS:**
- ✅ Cliente (selecionar da lista)
- ✅ Número do Processo
- ✅ Tribunal
- ✅ Assunto

**Campos OPCIONAIS:**
- Valor da Causa
- Status (ACTIVE, ARCHIVED, FINISHED)
- Observações

**Exemplo de dados válidos:**
```
Cliente: [Selecionar da lista]
Número: 1234567-20.2024.8.19.0001
Tribunal: TJRJ - Tribunal de Justiça do Rio de Janeiro
Assunto: Ação de Cobrança
Valor: 50000 (SEM R$, pontos ou vírgulas)
Status: ACTIVE
```

---

### 📄 ADICIONAR DOCUMENTO

**Campos OBRIGATÓRIOS:**
- ✅ Arquivo OU Link externo
- ✅ Nome do documento
- ✅ Cliente OU Processo

**Tipos de upload:**
- Arquivo local (PDF, DOC, XLS, imagens)
- Link Google Drive
- Link Google Docs
- Link Minio
- Outro link

---

### 💰 ADICIONAR TRANSAÇÃO FINANCEIRA

**Campos OBRIGATÓRIOS:**
- ✅ Tipo (INCOME ou EXPENSE)
- ✅ Descrição
- ✅ Valor
- ✅ Data

**Campos OPCIONAIS:**
- Cliente
- Processo
- Categoria

**Exemplo:**
```
Tipo: INCOME (receita) ou EXPENSE (despesa)
Descrição: Honorários advocatícios
Valor: 5000 (SEM R$)
Data: 2024-01-15
```

---

### 📅 ADICIONAR EVENTO NA AGENDA

**Campos OBRIGATÓRIOS:**
- ✅ Título
- ✅ Data/Hora Início
- ✅ Data/Hora Fim

**Campos OPCIONAIS:**
- Cliente
- Processo
- Descrição
- Local

---

## 🐛 SE AINDA DER ERRO

### Passo 1: Abra o Console do Browser

1. Pressione `F12`
2. Vá na aba "Network" (Rede)
3. Tente adicionar o dado
4. Veja qual requisição falhou (linha vermelha)
5. Clique na requisição
6. Vá na aba "Response"
7. **Me envie o que está escrito ali**

### Passo 2: Copie o Erro Exato

1. Pressione `F12`
2. Vá na aba "Console"
3. Tente adicionar o dado
4. Veja se aparece erro em vermelho
5. Clique no erro para expandir
6. **Me envie o erro completo**

---

## 🧪 TESTE SIMPLES

Tente criar UM cliente com DADOS MÍNIMOS:

1. Abra "Clientes"
2. Clique em "Novo Cliente"
3. Preencha APENAS:
   - Nome: `Teste`
   - Email: `teste@teste.com`
4. Deixe TODO o resto em branco
5. Clique em "Salvar"

**Se isso funcionar:** O problema é com algum campo específico
**Se não funcionar:** O problema é mais profundo

---

## 📊 DADOS JÁ EXISTENTES

Você JÁ TEM dados de teste criados via API:

### Clientes (7 no total):
- João Silva Teste
- Maria Santos Teste
- Empresa XYZ Ltda Teste
- Teste Simples
- João da Silva
- José Carlos da Silva Júnior
- Cliente Teste AI

### Processos (4 no total):
- Ação de Cobrança
- Ação Trabalhista
- Indenização por Danos Morais
- Teste de Integração com IA

**Para ver:** Vá em "Clientes" ou "Processos" e veja a lista

---

## 🔧 COMANDOS DE TESTE

Se quiser, posso testar criar qualquer tipo de dado por você via API.

Apenas me diga:
- Que tipo de dado quer criar (cliente, processo, etc)
- Quais informações quer colocar
- Eu crio via API e você verifica no sistema

---

## 💡 DICA IMPORTANTE

**Limpe o cache SEMPRE antes de testar:**

1. `Ctrl + Shift + Del`
2. Marque "Cookies" e "Cache"
3. Limpe
4. **Feche o navegador completamente**
5. Abra novamente
6. Faça login
7. Teste

---

## 🎯 PRÓXIMOS PASSOS

1. Limpe o cache e teste criar cliente mínimo
2. Se funcionar: teste com mais campos
3. Se não funcionar: me envie screenshot do erro (F12 → Console)
4. Se ainda não funcionar: me envie o que está no Network (F12 → Network)

**EU VOU RESOLVER ISSO!** Só preciso saber o erro exato que você está vendo.

