const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'teste.chatwoot@advwell.pro';
const PASSWORD = 'teste123';

async function checkEventsAPI() {
  try {
    // Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');

    // Get events
    const eventsResponse = await axios.get(`${API_URL}/schedule?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('📋 Resposta da API /schedule:');
    console.log('   Type:', typeof eventsResponse.data);
    console.log('   Keys:', Object.keys(eventsResponse.data));
    console.log('\n📄 Resposta completa (primeiros 500 chars):');
    console.log(JSON.stringify(eventsResponse.data, null, 2).substring(0, 500));

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

checkEventsAPI();
