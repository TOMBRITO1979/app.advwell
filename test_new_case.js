const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testNewCase() {
  console.log('🧪 TESTANDO CRIAÇÃO DE PROCESSO COM CAMPOS VAZIOS\n');

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

  // Test: Processo com campos vazios (incluindo value e linkProcesso)
  const timestamp = Date.now();
  console.log('Test: Processo com value="" e linkProcesso=""...');
  try {
    const res = await api.post('/cases', {
      clientId: clientId,
      processNumber: `NEW-TEST-${timestamp}`,
      court: 'TJRJ',
      subject: 'Teste Final de Validação',
      value: '',         // String vazia
      status: '',
      notes: '',
      informarCliente: '',
      linkProcesso: ''   // String vazia
    });
    console.log('✅ PASSOU! ID:', res.data.id);
    console.log('   Valor:', res.data.value);
    console.log('   Link:', res.data.linkProcesso);
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

testNewCase().catch(console.error);
