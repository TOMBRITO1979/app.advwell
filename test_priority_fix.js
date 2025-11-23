const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'admin@costaassociados.adv.br';
const PASSWORD = 'Senhanova2024@';

async function test() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK');

    // Create new event with priority
    const createResponse = await axios.post(`${API_URL}/schedule`, {
      title: 'Teste Priority NOVA',
      type: 'TAREFA',
      priority: 'ALTA',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento criado:');
    console.log(`   ID: ${createResponse.data.id}`);
    console.log(`   Title: ${createResponse.data.title}`);
    console.log(`   Priority retornado: ${createResponse.data.priority}`);

    // Get the event
    const getResponse = await axios.get(`${API_URL}/schedule/${createResponse.data.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('\n✅ GET evento:');
    console.log(`   Priority retornado: ${getResponse.data.priority}`);

    if (getResponse.data.priority === 'ALTA') {
      console.log('\n🎉 SUCESSO! Priority está funcionando corretamente!');
    } else {
      console.log('\n❌ ERRO! Priority ainda retorna:', getResponse.data.priority);
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

test();
