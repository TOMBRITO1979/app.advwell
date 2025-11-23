const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const TEST_EMAIL = 'wasolutionscorp@gmail.com';
const TEST_PASSWORD = 'password';

let authToken = '';
let testClientId = '';
let testCaseId = '';

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: API_URL,
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function login() {
  console.log('\n📝 1. TESTE DE LOGIN');
  console.log('='.repeat(50));
  try {
    const response = await api.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    authToken = response.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ Login bem-sucedido!');
    console.log(`   Usuário: ${response.data.user.name}`);
    console.log(`   Role: ${response.data.user.role}`);
    return true;
  } catch (error) {
    console.log('❌ Erro no login:', error.response?.data?.error || error.message);
    return false;
  }
}

async function listExistingData() {
  console.log('\n📊 2. VERIFICAR DADOS EXISTENTES');
  console.log('='.repeat(50));
  try {
    const [clientsRes, casesRes] = await Promise.all([
      api.get('/clients'),
      api.get('/cases')
    ]);
    console.log(`✅ ${clientsRes.data.length} clientes encontrados`);
    console.log(`✅ ${casesRes.data.length} processos encontrados`);

    // Check for cases with AI summaries
    const casesWithSummary = casesRes.data.filter(c => c.aiSummary);
    console.log(`✅ ${casesWithSummary.length} processos com resumo de IA`);

    if (casesRes.data.length > 0) {
      testCaseId = casesRes.data[0].id;
      console.log(`   Usando processo existente: ${casesRes.data[0].processNumber}`);
    }

    return true;
  } catch (error) {
    console.log('❌ Erro ao listar dados:', error.response?.data?.error || error.message);
    return false;
  }
}

async function createTestClient() {
  console.log('\n👤 3. CRIAR CLIENTE DE TESTE');
  console.log('='.repeat(50));
  try {
    const response = await api.post('/clients', {
      name: `Cliente Teste AI ${Date.now()}`,
      email: `teste.ai.${Date.now()}@example.com`,
      phone: '11999998888',
      cpfCnpj: `${Math.floor(Math.random() * 100000000000)}`,
      address: 'Rua Teste, 123'
    });
    testClientId = response.data.id;
    console.log('✅ Cliente criado com sucesso!');
    console.log(`   ID: ${testClientId}`);
    console.log(`   Nome: ${response.data.name}`);
    return true;
  } catch (error) {
    console.log('❌ Erro ao criar cliente:', error.response?.data?.error || error.message);
    // If client already exists, try to get existing clients
    try {
      const clients = await api.get('/clients');
      if (clients.data.length > 0) {
        testClientId = clients.data[0].id;
        console.log('⚠️  Usando cliente existente:', clients.data[0].name);
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }
}

async function createTestCase() {
  console.log('\n⚖️  4. CRIAR PROCESSO DE TESTE');
  console.log('='.repeat(50));

  if (!testClientId) {
    console.log('❌ Nenhum cliente disponível para criar processo');
    return false;
  }

  try {
    const processNumber = `${Math.floor(Math.random() * 10000000)}-11.2025.8.19.0001`;
    const response = await api.post('/cases', {
      clientId: testClientId,
      processNumber: processNumber,
      court: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      subject: 'Teste de Integração com IA',
      value: 50000,
      status: 'ACTIVE',
      notes: 'Processo criado para testar funcionalidade de IA'
    });
    testCaseId = response.data.id;
    console.log('✅ Processo criado com sucesso!');
    console.log(`   ID: ${testCaseId}`);
    console.log(`   Número: ${response.data.processNumber}`);
    return true;
  } catch (error) {
    console.log('❌ Erro ao criar processo:', error.response?.data?.error || error.message);
    return false;
  }
}

async function checkAIConfig() {
  console.log('\n🤖 5. VERIFICAR CONFIGURAÇÃO DE IA');
  console.log('='.repeat(50));
  try {
    const response = await api.get('/ai-config');
    if (response.data) {
      console.log('✅ Configuração de IA encontrada!');
      console.log(`   Provider: ${response.data.provider}`);
      console.log(`   Modelo: ${response.data.model}`);
      console.log(`   Habilitado: ${response.data.enabled ? 'Sim' : 'Não'}`);
      console.log(`   Auto-resumo: ${response.data.autoSummarize ? 'Sim' : 'Não'}`);
      return true;
    } else {
      console.log('⚠️  Nenhuma configuração de IA encontrada');
      console.log('   Para testar IA, configure em: Configurações de IA no sistema');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️  Nenhuma configuração de IA encontrada');
      console.log('   Para testar IA, configure em: Configurações de IA no sistema');
      return false;
    }
    console.log('❌ Erro ao verificar configuração:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testGenerateAISummary() {
  console.log('\n🧠 6. TESTAR GERAÇÃO DE RESUMO DE IA');
  console.log('='.repeat(50));

  if (!testCaseId) {
    console.log('❌ Nenhum processo disponível para gerar resumo');
    return false;
  }

  try {
    console.log('   Gerando resumo para processo:', testCaseId);
    const response = await api.post(`/cases/${testCaseId}/generate-summary`);
    console.log('✅ Resumo de IA gerado com sucesso!');
    console.log('\n📝 Resumo:');
    console.log('-'.repeat(50));
    console.log(response.data.aiSummary || 'Resumo vazio');
    console.log('-'.repeat(50));
    return true;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('não configurada') || errorMsg.includes('not configured')) {
      console.log('⚠️  IA não configurada - isso é esperado se você não configurou a API key');
      console.log('   Para testar completamente, configure a IA em: Configurações de IA');
      return 'skipped';
    }
    console.log('❌ Erro ao gerar resumo:', errorMsg);
    return false;
  }
}

async function verifyCaseWithSummary() {
  console.log('\n🔍 7. VERIFICAR PROCESSO COM RESUMO');
  console.log('='.repeat(50));

  if (!testCaseId) {
    console.log('❌ Nenhum processo para verificar');
    return false;
  }

  try {
    const response = await api.get(`/cases/${testCaseId}`);
    console.log('✅ Processo recuperado com sucesso!');
    console.log(`   Número: ${response.data.processNumber}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Tem resumo IA: ${response.data.aiSummary ? 'Sim' : 'Não'}`);

    if (response.data.aiSummary) {
      console.log(`   Tamanho do resumo: ${response.data.aiSummary.length} caracteres`);
    }

    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar processo:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 INICIANDO TESTES DE INTEGRAÇÃO COM IA');
  console.log('='.repeat(50));

  const results = {
    login: false,
    listData: false,
    createClient: false,
    createCase: false,
    checkAIConfig: false,
    generateSummary: false,
    verifyCase: false
  };

  // Run tests sequentially
  results.login = await login();
  if (!results.login) {
    console.log('\n❌ Teste falhou no login. Abortando...');
    process.exit(1);
  }

  results.listData = await listExistingData();
  results.createClient = await createTestClient();
  results.createCase = await createTestCase();
  results.checkAIConfig = await checkAIConfig();
  results.generateSummary = await testGenerateAISummary();
  results.verifyCase = await verifyCaseWithSummary();

  // Print summary
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('='.repeat(50));
  console.log(`✅ Login: ${results.login ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Listar Dados: ${results.listData ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Criar Cliente: ${results.createClient ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Criar Processo: ${results.createCase ? 'PASSOU' : 'FALHOU'}`);
  console.log(`${results.checkAIConfig ? '✅' : '⚠️ '} Configuração IA: ${results.checkAIConfig ? 'PASSOU' : 'NÃO CONFIGURADA'}`);
  console.log(`${results.generateSummary === 'skipped' ? '⚠️ ' : results.generateSummary ? '✅' : '❌'} Gerar Resumo: ${results.generateSummary === 'skipped' ? 'IGNORADO' : results.generateSummary ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Verificar Processo: ${results.verifyCase ? 'PASSOU' : 'FALHOU'}`);

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  console.log('\n' + '='.repeat(50));
  console.log(`📈 RESULTADO FINAL: ${passed}/${total} testes passaram`);
  console.log('='.repeat(50));

  if (!results.checkAIConfig || results.generateSummary === 'skipped') {
    console.log('\n⚠️  NOTA: Para testar completamente a funcionalidade de IA:');
    console.log('   1. Acesse o sistema: https://app.advwell.pro');
    console.log('   2. Faça login como admin@costaassociados.adv.br');
    console.log('   3. Vá em "Configurações de IA" no menu');
    console.log('   4. Configure sua API key (OpenAI ou Gemini)');
    console.log('   5. Execute este teste novamente');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Erro fatal:', error);
  process.exit(1);
});
