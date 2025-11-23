const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'admin@costaassociados.adv.br';
const PASSWORD = 'Teste123!';

const api = axios.create({
  baseURL: API_URL,
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

let token = '';

async function login() {
  console.log('🔐 Fazendo login...');
  const response = await api.post('/auth/login', { email: EMAIL, password: PASSWORD });
  token = response.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login realizado com sucesso!\n');
  return response.data.user;
}

async function createClients() {
  console.log('👥 CRIANDO CLIENTES DE TESTE');
  console.log('='.repeat(50));

  const clients = [
    {
      name: 'João Silva Teste',
      email: 'joao.silva@teste.com',
      phone: '(21) 98765-4321',
      cpfCnpj: '123.456.789-01',
      address: 'Rua das Flores, 123 - Centro - Rio de Janeiro/RJ'
    },
    {
      name: 'Maria Santos Teste',
      email: 'maria.santos@teste.com',
      phone: '(21) 98765-4322',
      cpfCnpj: '234.567.890-12',
      address: 'Av. Brasil, 456 - Copacabana - Rio de Janeiro/RJ'
    },
    {
      name: 'Empresa XYZ Ltda Teste',
      email: 'contato@empresaxyz.com',
      phone: '(21) 3333-4444',
      cpfCnpj: '12.345.678/0001-90',
      address: 'Rua Comercial, 789 - Centro - Rio de Janeiro/RJ'
    }
  ];

  const createdClients = [];

  for (const client of clients) {
    try {
      const response = await api.post('/clients', client);
      console.log(`✅ Cliente criado: ${response.data.name} (${response.data.email})`);
      createdClients.push(response.data);
    } catch (error) {
      console.log(`⚠️  Cliente ${client.name}: ${error.response?.data?.error || 'Erro desconhecido'}`);
    }
  }

  console.log(`\n📊 Total de clientes criados: ${createdClients.length}\n`);
  return createdClients;
}

async function createCases(clients) {
  console.log('⚖️  CRIANDO PROCESSOS DE TESTE');
  console.log('='.repeat(50));

  if (clients.length === 0) {
    console.log('❌ Nenhum cliente disponível para criar processos\n');
    return [];
  }

  const cases = [
    {
      clientId: clients[0].id,
      processNumber: `${Math.floor(Math.random() * 10000000)}-20.2024.8.19.0001`,
      court: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      subject: 'Ação de Cobrança',
      value: 50000,
      status: 'ACTIVE',
      notes: 'Processo de cobrança de valores devidos. Cliente solicita acompanhamento quinzenal.',
      ultimoAndamento: 'Petição inicial protocolada em 15/01/2024',
      informarCliente: 'Processo iniciado. Aguardando citação do réu.'
    },
    {
      clientId: clients[1].id,
      processNumber: `${Math.floor(Math.random() * 10000000)}-20.2024.8.19.0002`,
      court: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      subject: 'Ação Trabalhista - Rescisão Indireta',
      value: 120000,
      status: 'ACTIVE',
      notes: 'Rescisão indireta por falta de pagamento de salários. Testemunhas já confirmadas.',
      ultimoAndamento: 'Audiência de conciliação agendada para 20/02/2024',
      informarCliente: 'Audiência marcada. Comparecer munido de documentos originais.'
    },
    {
      clientId: clients[2]?.id || clients[0].id,
      processNumber: `${Math.floor(Math.random() * 10000000)}-20.2024.8.19.0003`,
      court: 'TJSP - Tribunal de Justiça de São Paulo',
      subject: 'Ação de Indenização por Danos Morais',
      value: 80000,
      status: 'ACTIVE',
      notes: 'Empresa teve nome negativado indevidamente. Pedido de danos morais e materiais.',
      ultimoAndamento: 'Contestação apresentada pela parte ré em 10/01/2024',
      informarCliente: 'Réu contestou. Aguardando réplica de nossa equipe.'
    }
  ];

  const createdCases = [];

  for (const caseData of cases) {
    try {
      const response = await api.post('/cases', caseData);
      console.log(`✅ Processo criado: ${response.data.processNumber}`);
      console.log(`   Cliente: ${clients.find(c => c.id === caseData.clientId)?.name}`);
      console.log(`   Assunto: ${response.data.subject}`);
      console.log(`   Valor: R$ ${response.data.value.toLocaleString('pt-BR')}`);
      createdCases.push(response.data);
    } catch (error) {
      console.log(`⚠️  Processo ${caseData.processNumber}: ${error.response?.data?.error || 'Erro desconhecido'}`);
    }
  }

  console.log(`\n📊 Total de processos criados: ${createdCases.length}\n`);
  return createdCases;
}

async function addCaseParts(cases) {
  console.log('👨‍⚖️ ADICIONANDO PARTES AOS PROCESSOS');
  console.log('='.repeat(50));

  if (cases.length === 0) {
    console.log('❌ Nenhum processo disponível\n');
    return;
  }

  const parts = [
    {
      caseId: cases[0].id,
      type: 'AUTOR',
      name: 'João Silva Teste',
      cpfCnpj: '123.456.789-01',
      phone: '(21) 98765-4321',
      address: 'Rua das Flores, 123',
      email: 'joao.silva@teste.com',
      rg: '12.345.678-9',
      birthDate: '1980-05-15',
      civilStatus: 'Casado',
      profession: 'Empresário'
    },
    {
      caseId: cases[0].id,
      type: 'REU',
      name: 'Empresa Devedora S.A.',
      cpfCnpj: '98.765.432/0001-00',
      phone: '(21) 3333-5555',
      address: 'Av. Comercial, 999'
    }
  ];

  let partsCreated = 0;

  for (const part of parts) {
    try {
      await api.post(`/cases/${part.caseId}/parts`, part);
      console.log(`✅ Parte adicionada: ${part.name} (${part.type})`);
      partsCreated++;
    } catch (error) {
      console.log(`⚠️  ${part.name}: ${error.response?.data?.error || 'Erro desconhecido'}`);
    }
  }

  console.log(`\n📊 Total de partes criadas: ${partsCreated}\n`);
}

async function checkExistingData() {
  console.log('📊 VERIFICANDO DADOS EXISTENTES');
  console.log('='.repeat(50));

  try {
    const [clientsRes, casesRes] = await Promise.all([
      api.get('/clients'),
      api.get('/cases')
    ]);

    const clients = clientsRes.data.clients || clientsRes.data;
    const cases = casesRes.data.cases || casesRes.data;

    console.log(`✅ Clientes no sistema: ${Array.isArray(clients) ? clients.length : 'N/A'}`);
    console.log(`✅ Processos no sistema: ${Array.isArray(cases) ? cases.length : 'N/A'}`);
    console.log('');

    return { clients, cases };
  } catch (error) {
    console.log('❌ Erro ao verificar dados existentes:', error.message);
    return { clients: [], cases: [] };
  }
}

async function main() {
  console.log('\n🚀 CRIAÇÃO DE DADOS DE TESTE COMPLETOS');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Login
    const user = await login();
    console.log(`📋 Usuário: ${user.name} (${user.role})`);
    console.log(`🏢 Empresa: ${user.companyName || 'N/A'}\n`);

    // Check existing data
    await checkExistingData();

    // Create test data
    const clients = await createClients();
    const cases = await createCases(clients);
    await addCaseParts(cases);

    // Final summary
    console.log('✅ RESUMO FINAL');
    console.log('='.repeat(50));
    console.log(`✅ ${clients.length} novos clientes criados`);
    console.log(`✅ ${cases.length} novos processos criados`);
    console.log(`✅ Partes adicionadas aos processos`);
    console.log('');
    console.log('🎉 Dados de teste criados com sucesso!');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Acesse https://app.advwell.pro');
    console.log('   2. Login: admin@costaassociados.adv.br / Teste123!');
    console.log('   3. Navegue pelas abas: Dashboard, Clientes, Processos');
    console.log('   4. Configure IA em "Configurações de IA"');
    console.log('   5. Teste geração de resumos nos processos');

  } catch (error) {
    console.error('\n❌ ERRO:', error.response?.data || error.message);
  }
}

main();
