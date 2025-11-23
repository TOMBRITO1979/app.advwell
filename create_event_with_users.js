const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'teste.chatwoot@advwell.pro';
const PASSWORD = 'teste123';

async function createEventWithUsers() {
  try {
    // Login
    console.log(`🔐 Fazendo login com ${EMAIL}...`);
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');

    // Buscar usuários
    console.log('👥 Buscando usuários da empresa...');
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    // Extract users array correctly
    const allUsers = Array.isArray(usersResponse.data)
      ? usersResponse.data
      : usersResponse.data.users || [];

    console.log(`   Total de usuários: ${allUsers.length}`);

    if (allUsers.length < 2) {
      console.log('⚠️  Menos de 2 usuários disponíveis. Criando evento sem atribuição de usuários.');
      return;
    }

    const userIds = allUsers.slice(0, 3).map(u => u.id);
    console.log(`   Usuários selecionados: ${userIds.length}\n`);

    // Criar evento com usuários atribuídos
    console.log('📝 Criando evento com MULTI-USUÁRIOS e priority=URGENTE...');
    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 3);
    afterTomorrow.setHours(15, 0, 0, 0);

    const createResponse = await axios.post(`${API_URL}/schedule`, {
      title: '👥 Reunião em Equipe - URGENTE',
      description: 'Evento com múltiplos usuários atribuídos para testar funcionalidade multi-user',
      type: 'COMPROMISSO',
      priority: 'URGENTE',
      date: afterTomorrow.toISOString(),
      assignedUserIds: userIds,
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento criado com sucesso!');
    console.log(`   ID: ${createResponse.data.id}`);
    console.log(`   Title: ${createResponse.data.title}`);
    console.log(`   Priority: ${createResponse.data.priority}`);
    console.log(`   Date: ${new Date(createResponse.data.date).toLocaleString('pt-BR')}`);
    console.log(`   Usuários atribuídos: ${createResponse.data.assignedUsers?.length || 0}`);

    if (createResponse.data.assignedUsers) {
      console.log('\n   👥 Usuários:');
      createResponse.data.assignedUsers.forEach(assignment => {
        console.log(`      - ${assignment.user.name} (${assignment.user.email})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 EVENTO COM MULTI-USUÁRIOS CRIADO!');
    console.log(`   ✅ Priority: ${createResponse.data.priority}`);
    console.log(`   ✅ Usuários atribuídos: ${createResponse.data.assignedUsers?.length || 0}`);
    console.log('\n📱 Verifique na interface: https://app.advwell.pro');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('   Detalhes do erro 400:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createEventWithUsers();
