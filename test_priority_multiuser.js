const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'teste.priority@advwell.pro';
const PASSWORD = 'teste123'; // Senha: teste123

// IDs dos usuários da mesma empresa
const USER_IDS = [
  '8e4cf102-491f-4cfe-9fb1-da2cbbb1fa70', // Teste Priority User (eu mesmo)
  'ca2cd4c3-b59c-40e9-865b-7ce14c9a7b4c', // Ana Silva
  'e9fbbd88-d4b2-400f-80cb-f05c697adf70', // Carlos Eduardo
];

let token = '';
let eventId = '';

async function login() {
  console.log('\n🔐 TESTE 1: Login...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    token = response.data.token;
    console.log('✅ Login bem-sucedido!');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

async function createEvent() {
  console.log('\n📝 TESTE 2: Criar evento com prioridade ALTA e 2 usuários atribuídos...');
  try {
    const response = await axios.post(`${API_URL}/schedule`, {
      title: 'Reunião com Cliente - Teste Priority',
      description: 'Teste de prioridade e atribuição de múltiplos usuários',
      type: 'TAREFA',
      priority: 'ALTA',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
      assignedUserIds: [USER_IDS[0], USER_IDS[1]], // Ana e Carlos
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    eventId = response.data.id;
    console.log('✅ Evento criado com sucesso!');
    console.log(`   ID: ${eventId}`);
    console.log(`   Prioridade: ${response.data.priority}`);
    console.log(`   Usuários atribuídos: ${response.data.assignedUsers?.length || 0}`);

    if (response.data.assignedUsers) {
      response.data.assignedUsers.forEach(assignment => {
        console.log(`      - ${assignment.user.name} (${assignment.user.email})`);
      });
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar evento:', error.response?.data || error.message);
    return null;
  }
}

async function getEvent() {
  console.log('\n🔍 TESTE 3: Buscar evento criado...');
  try {
    const response = await axios.get(`${API_URL}/schedule/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento recuperado com sucesso!');
    console.log(`   Título: ${response.data.title}`);
    console.log(`   Prioridade: ${response.data.priority}`);
    console.log(`   Usuários atribuídos: ${response.data.assignedUsers?.length || 0}`);

    return response.data;
  } catch (error) {
    console.error('❌ Erro ao buscar evento:', error.response?.data || error.message);
    return null;
  }
}

async function updateEvent() {
  console.log('\n✏️  TESTE 4: Atualizar evento - mudar prioridade para URGENTE e adicionar 3º usuário...');
  try {
    const response = await axios.put(`${API_URL}/schedule/${eventId}`, {
      priority: 'URGENTE',
      assignedUserIds: [USER_IDS[0], USER_IDS[1], USER_IDS[2]], // Ana, Carlos e Mariana
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento atualizado com sucesso!');
    console.log(`   Prioridade: ${response.data.priority}`);
    console.log(`   Usuários atribuídos: ${response.data.assignedUsers?.length || 0}`);

    if (response.data.assignedUsers) {
      response.data.assignedUsers.forEach(assignment => {
        console.log(`      - ${assignment.user.name} (${assignment.user.email})`);
      });
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erro ao atualizar evento:', error.response?.data || error.message);
    return null;
  }
}

async function listEvents() {
  console.log('\n📋 TESTE 5: Listar eventos (verificar se inclui assignedUsers)...');
  try {
    const response = await axios.get(`${API_URL}/schedule?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log(`✅ ${response.data.data.length} eventos listados`);
    console.log(`   Total no sistema: ${response.data.total}`);

    // Verificar se o evento criado está na lista
    const ourEvent = response.data.data.find(e => e.id === eventId);
    if (ourEvent) {
      console.log(`   ✓ Evento de teste encontrado na lista`);
      console.log(`     Prioridade: ${ourEvent.priority}`);
      console.log(`     Usuários: ${ourEvent.assignedUsers?.length || 0}`);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erro ao listar eventos:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 INICIANDO TESTES DE PRIORIDADE E MULTI-USUÁRIO\n');
  console.log('='.repeat(60));

  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Testes abortados - falha no login');
    return;
  }

  const created = await createEvent();
  if (!created) {
    console.log('\n❌ Testes abortados - falha ao criar evento');
    return;
  }

  await getEvent();
  await updateEvent();
  await listEvents();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TESTES CONCLUÍDOS COM SUCESSO!');
  console.log(`\n📊 Evento ID para verificação no banco: ${eventId}\n`);
}

runTests().catch(console.error);
