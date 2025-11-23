const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testCaseCreation() {
  console.log('🧪 TESTANDO CRIAÇÃO DE PROCESSO\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  // Get a client ID
  const clientsRes = await api.get('/clients?limit=1');
  const clientId = clientsRes.data.data[0].id;
  console.log('✅ Cliente ID:', clientId, '\n');

  // Test 1: Processo com campos vazios
  console.log('Test 1: Processo com campos vazios (como frontend envia)...');
  try {
    const res = await api.post('/cases', {
      clientId: clientId,
      processNumber: '1234567-20.2025.8.19.0001',
      court: 'TJRJ',
      subject: 'Teste',
      value: '',
      status: '',
      notes: '',
      informarCliente: '',
      linkProcesso: ''
    });
    console.log('✅ PASSOU! ID:', res.data.id);
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }

  console.log('\nTest 2: Processo mínimo...');
  try {
    const res = await api.post('/cases', {
      clientId: clientId,
      processNumber: '9999999-20.2025.8.19.0002',
      court: 'TJRJ',
      subject: 'Teste Mínimo'
    });
    console.log('✅ PASSOU! ID:', res.data.id);
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

testCaseCreation().catch(console.error);
