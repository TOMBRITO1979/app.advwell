const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

let authToken = '';
let testData = {
  userId: '',
  companyId: '',
  clientId: '',
  caseId: '',
  transactionId: '',
  accountPayableId: '',
  documentId: '',
  scheduleId: ''
};

// Configurar axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Adicionar token ao header
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function test(name, fn) {
  try {
    console.log(`\n🧪 Testando: ${name}`);
    await fn();
    console.log(`✅ ${name} - PASSOU`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} - FALHOU`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes completos do sistema AdvWell\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;

  // 1. AUTENTICAÇÃO
  console.log('\n📋 FASE 1: AUTENTICAÇÃO');
  if (await test('Login', async () => {
    const response = await api.post('/auth/login', {
      email: 'wasolutionscorp@gmail.com',
      password: 'Tomautoma@1'
    });
    authToken = response.data.token;
    testData.userId = response.data.user.id;
    testData.companyId = response.data.user.companyId;
    console.log(`   Token obtido: ${authToken.substring(0, 20)}...`);
    console.log(`   User ID: ${testData.userId}`);
    console.log(`   Company ID: ${testData.companyId}`);
  })) passed++; else failed++;

  // 2. CLIENTES
  console.log('\n📋 FASE 2: CLIENTES');
  if (await test('Criar Cliente', async () => {
    const response = await api.post('/clients', {
      name: 'Cliente Teste Completo',
      cpf: '12345678901',
      email: 'cliente.teste@advwell.pro',
      phone: '(21) 98765-4321',
      address: 'Rua Teste, 123 - Centro',
      birthDate: '1990-01-15',
      notes: 'Cliente criado em teste completo do sistema'
    });
    testData.clientId = response.data.id;
    console.log(`   Cliente ID: ${testData.clientId}`);
  })) passed++; else failed++;

  if (await test('Listar Clientes', async () => {
    const response = await api.get('/clients');
    console.log(`   Total de clientes: ${response.data.length}`);
  })) passed++; else failed++;

  if (await test('Buscar Cliente', async () => {
    const response = await api.get(`/clients/${testData.clientId}`);
    console.log(`   Cliente: ${response.data.name}`);
  })) passed++; else failed++;

  if (await test('Atualizar Cliente', async () => {
    await api.put(`/clients/${testData.clientId}`, {
      name: 'Cliente Teste Completo - Atualizado',
      cpf: '12345678901',
      email: 'cliente.teste@advwell.pro',
      phone: '(21) 98765-4321',
      address: 'Rua Teste, 456 - Bairro Novo'
    });
  })) passed++; else failed++;

  // 3. PROCESSOS
  console.log('\n📋 FASE 3: PROCESSOS');
  if (await test('Criar Processo', async () => {
    const response = await api.post('/cases', {
      processNumber: '1234567-89.2025.8.19.0001',
      clientId: testData.clientId,
      tribunal: 'TJRJ',
      subject: 'Ação de Teste Completo do Sistema',
      value: 50000.00,
      status: 'ACTIVE',
      notes: 'Processo criado para teste completo'
    });
    testData.caseId = response.data.id;
    console.log(`   Processo ID: ${testData.caseId}`);
  })) passed++; else failed++;

  if (await test('Listar Processos', async () => {
    const response = await api.get('/cases');
    console.log(`   Total de processos: ${response.data.length}`);
  })) passed++; else failed++;

  if (await test('Buscar Processo', async () => {
    const response = await api.get(`/cases/${testData.caseId}`);
    console.log(`   Processo: ${response.data.processNumber}`);
  })) passed++; else failed++;

  if (await test('Adicionar Parte ao Processo - Autor', async () => {
    await api.post(`/cases/${testData.caseId}/parts`, {
      type: 'AUTOR',
      name: 'João da Silva Teste',
      cpfCnpj: '98765432100',
      email: 'joao.teste@email.com',
      phone: '(21) 99999-8888',
      address: 'Rua do Autor, 789',
      civilStatus: 'Casado',
      profession: 'Engenheiro',
      rg: '123456789',
      birthDate: '1985-05-10'
    });
  })) passed++; else failed++;

  if (await test('Adicionar Parte ao Processo - Réu', async () => {
    await api.post(`/cases/${testData.caseId}/parts`, {
      type: 'REU',
      name: 'Maria Santos Teste',
      cpfCnpj: '11122233344',
      phone: '(21) 88888-7777',
      address: 'Rua do Réu, 456'
    });
  })) passed++; else failed++;

  if (await test('Listar Partes do Processo', async () => {
    const response = await api.get(`/cases/${testData.caseId}/parts`);
    console.log(`   Total de partes: ${response.data.length}`);
  })) passed++; else failed++;

  // 4. FINANCEIRO
  console.log('\n📋 FASE 4: FINANCEIRO');
  if (await test('Criar Receita', async () => {
    const response = await api.post('/financial', {
      type: 'INCOME',
      description: 'Honorários - Teste Completo',
      amount: 15000.00,
      date: new Date().toISOString(),
      clientId: testData.clientId,
      caseId: testData.caseId
    });
    testData.transactionId = response.data.id;
    console.log(`   Receita ID: ${testData.transactionId}`);
  })) passed++; else failed++;

  if (await test('Criar Despesa', async () => {
    await api.post('/financial', {
      type: 'EXPENSE',
      description: 'Custas Processuais - Teste',
      amount: 500.00,
      date: new Date().toISOString(),
      clientId: testData.clientId,
      caseId: testData.caseId
    });
  })) passed++; else failed++;

  if (await test('Listar Transações', async () => {
    const response = await api.get('/financial');
    console.log(`   Total de transações: ${response.data.data.length}`);
    console.log(`   Receitas: R$ ${response.data.summary.totalIncome.toFixed(2)}`);
    console.log(`   Despesas: R$ ${response.data.summary.totalExpense.toFixed(2)}`);
    console.log(`   Saldo: R$ ${response.data.summary.balance.toFixed(2)}`);
  })) passed++; else failed++;

  // 5. CONTAS A PAGAR (NOVA FUNCIONALIDADE)
  console.log('\n📋 FASE 5: CONTAS A PAGAR (NOVA)');
  if (await test('Criar Conta a Pagar - Pendente', async () => {
    const response = await api.post('/accounts-payable', {
      supplier: 'Fornecedor Teste Ltda',
      description: 'Aluguel do escritório - Teste',
      amount: 3500.00,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias
      category: 'Aluguel',
      notes: 'Conta de teste criada no teste completo'
    });
    testData.accountPayableId = response.data.id;
    console.log(`   Conta a Pagar ID: ${testData.accountPayableId}`);
  })) passed++; else failed++;

  if (await test('Criar Conta a Pagar - Salários', async () => {
    await api.post('/accounts-payable', {
      supplier: 'Funcionários',
      description: 'Folha de pagamento - Teste',
      amount: 8500.00,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias
      category: 'Salários'
    });
  })) passed++; else failed++;

  if (await test('Listar Contas a Pagar', async () => {
    const response = await api.get('/accounts-payable');
    console.log(`   Total de contas: ${response.data.data.length}`);
  })) passed++; else failed++;

  if (await test('Buscar Conta a Pagar', async () => {
    const response = await api.get(`/accounts-payable/${testData.accountPayableId}`);
    console.log(`   Fornecedor: ${response.data.supplier}`);
    console.log(`   Valor: R$ ${response.data.amount.toFixed(2)}`);
    console.log(`   Status: ${response.data.status}`);
  })) passed++; else failed++;

  if (await test('Atualizar Conta a Pagar', async () => {
    await api.put(`/accounts-payable/${testData.accountPayableId}`, {
      supplier: 'Fornecedor Teste Ltda',
      description: 'Aluguel do escritório - Teste Atualizado',
      amount: 3800.00,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'Aluguel',
      notes: 'Conta atualizada no teste'
    });
  })) passed++; else failed++;

  if (await test('Marcar Conta como Paga', async () => {
    await api.post(`/accounts-payable/${testData.accountPayableId}/pay`, {
      paidDate: new Date().toISOString()
    });
  })) passed++; else failed++;

  if (await test('Filtrar Contas por Status - PAID', async () => {
    const response = await api.get('/accounts-payable?status=PAID');
    console.log(`   Contas pagas: ${response.data.data.length}`);
  })) passed++; else failed++;

  // 6. DOCUMENTOS
  console.log('\n📋 FASE 6: DOCUMENTOS');
  if (await test('Criar Documento - Link Externo', async () => {
    const response = await api.post('/documents', {
      name: 'Procuração - Teste',
      description: 'Documento de teste com link externo',
      storageType: 'link',
      externalUrl: 'https://drive.google.com/file/d/test123',
      externalType: 'google_drive',
      clientId: testData.clientId,
      caseId: testData.caseId
    });
    testData.documentId = response.data.id;
    console.log(`   Documento ID: ${testData.documentId}`);
  })) passed++; else failed++;

  if (await test('Criar Documento - Link Google Docs', async () => {
    await api.post('/documents', {
      name: 'Contrato - Teste',
      description: 'Documento Google Docs',
      storageType: 'link',
      externalUrl: 'https://docs.google.com/document/d/test456',
      externalType: 'google_docs',
      clientId: testData.clientId
    });
  })) passed++; else failed++;

  if (await test('Listar Documentos', async () => {
    const response = await api.get('/documents');
    console.log(`   Total de documentos: ${response.data.data.length}`);
  })) passed++; else failed++;

  if (await test('Buscar Documentos por Cliente', async () => {
    const response = await api.get(`/documents/search?clientId=${testData.clientId}`);
    console.log(`   Documentos do cliente: ${response.data.length}`);
  })) passed++; else failed++;

  if (await test('Buscar Documentos por Processo', async () => {
    const response = await api.get(`/documents/search?caseId=${testData.caseId}`);
    console.log(`   Documentos do processo: ${response.data.length}`);
  })) passed++; else failed++;

  // 7. AGENDA
  console.log('\n📋 FASE 7: AGENDA');
  if (await test('Criar Compromisso', async () => {
    const response = await api.post('/schedule', {
      title: 'Reunião com Cliente - Teste',
      description: 'Reunião de acompanhamento processual',
      type: 'COMPROMISSO',
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1h
      location: 'Escritório',
      clientId: testData.clientId,
      caseId: testData.caseId
    });
    testData.scheduleId = response.data.id;
    console.log(`   Compromisso ID: ${testData.scheduleId}`);
  })) passed++; else failed++;

  if (await test('Criar Audiência', async () => {
    await api.post('/schedule', {
      title: 'Audiência de Instrução - Teste',
      description: 'Audiência teste',
      type: 'AUDIENCIA',
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2h
      location: 'Fórum Central - Sala 5',
      caseId: testData.caseId
    });
  })) passed++; else failed++;

  if (await test('Criar Prazo', async () => {
    await api.post('/schedule', {
      title: 'Prazo para Contestação - Teste',
      description: 'Prazo teste',
      type: 'PRAZO',
      startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 dias
      caseId: testData.caseId
    });
  })) passed++; else failed++;

  if (await test('Criar Google Meet', async () => {
    await api.post('/schedule', {
      title: 'Reunião Online - Teste',
      description: 'Teste de Google Meet',
      type: 'GOOGLE_MEET',
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1h
      clientId: testData.clientId
    });
  })) passed++; else failed++;

  if (await test('Listar Eventos da Agenda', async () => {
    const response = await api.get('/schedule');
    console.log(`   Total de eventos: ${response.data.length}`);
  })) passed++; else failed++;

  // 8. DASHBOARD
  console.log('\n📋 FASE 8: DASHBOARD');
  if (await test('Obter Atividades Recentes', async () => {
    const response = await api.get('/dashboard/activities');
    console.log(`   Atividades recentes: ${response.data.length}`);
  })) passed++; else failed++;

  // 9. CONFIGURAÇÕES DA EMPRESA
  console.log('\n📋 FASE 9: CONFIGURAÇÕES');
  if (await test('Buscar Configurações da Empresa', async () => {
    const response = await api.get('/companies/own');
    console.log(`   Empresa: ${response.data.name}`);
    console.log(`   Email: ${response.data.email}`);
  })) passed++; else failed++;

  if (await test('Atualizar Configurações', async () => {
    const response = await api.get('/companies/own');
    await api.put('/companies/own', {
      name: response.data.name,
      email: response.data.email,
      phone: '(21) 3333-4444',
      address: 'Av. Teste, 1000',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000'
    });
  })) passed++; else failed++;

  // RESUMO FINAL
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Testes Passaram: ${passed}`);
  console.log(`❌ Testes Falharam: ${failed}`);
  console.log(`📈 Taxa de Sucesso: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema funcionando 100%');
  } else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM. Verificar logs acima.');
  }

  console.log('\n📝 IDs Criados para Referência:');
  console.log(JSON.stringify(testData, null, 2));
}

runTests().catch(console.error);
