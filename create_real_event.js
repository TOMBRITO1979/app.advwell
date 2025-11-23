const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'teste.chatwoot@advwell.pro';
const PASSWORD = 'teste123';

async function createRealEvent() {
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

    // Criar evento REAL para o usuário ver
    console.log('📝 Criando evento REAL com priority=ALTA...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const createResponse = await axios.post(`${API_URL}/schedule`, {
      title: '✅ Teste Priority - Sistema Funcionando',
      description: 'Este evento foi criado para demonstrar que o sistema de prioridades está funcionando 100%!',
      type: 'TAREFA',
      priority: 'ALTA',
      date: tomorrow.toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento criado com sucesso!');
    console.log(`   ID: ${createResponse.data.id}`);
    console.log(`   Title: ${createResponse.data.title}`);
    console.log(`   Priority: ${createResponse.data.priority}`);
    console.log(`   Date: ${new Date(createResponse.data.date).toLocaleString('pt-BR')}`);
    console.log(`\n✨ Verifique na interface: https://app.advwell.pro\n`);

    // Criar outro evento com prioridade URGENTE
    console.log('📝 Criando segundo evento com priority=URGENTE...');
    const afterTomorrow = new Date();
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    afterTomorrow.setHours(14, 30, 0, 0);

    const createResponse2 = await axios.post(`${API_URL}/schedule`, {
      title: '🔴 Teste Priority URGENTE',
      description: 'Evento com prioridade URGENTE para testar todas as prioridades',
      type: 'COMPROMISSO',
      priority: 'URGENTE',
      date: afterTomorrow.toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Segundo evento criado com sucesso!');
    console.log(`   ID: ${createResponse2.data.id}`);
    console.log(`   Title: ${createResponse2.data.title}`);
    console.log(`   Priority: ${createResponse2.data.priority}`);
    console.log(`   Date: ${new Date(createResponse2.data.date).toLocaleString('pt-BR')}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCESSO! Dois eventos criados:');
    console.log('   ✅ Evento 1: Priority ALTA');
    console.log('   ✅ Evento 2: Priority URGENTE');
    console.log('\n📱 Acesse a interface para visualizar os eventos!');
    console.log('   URL: https://app.advwell.pro');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('   Detalhes do erro 400:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createRealEvent();
