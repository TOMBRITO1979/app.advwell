const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function createSpecificProcess() {
  console.log('🧪 CRIANDO PROCESSO: 00249252420208190206\n');

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
  console.log('✅ Cliente ID:', clientId);
  console.log('   Cliente:', clientsRes.data.data[0].name, '\n');

  // Criar processo
  try {
    const res = await api.post('/cases', {
      clientId: clientId,
      processNumber: '0024925-24.2020.8.19.0206',
      court: 'TJRJ',
      subject: 'Processo de Teste',
      value: '',
      status: 'ACTIVE',
      notes: 'Processo cadastrado para teste',
      informarCliente: '',
      linkProcesso: ''
    });

    console.log('✅ PROCESSO CRIADO COM SUCESSO!\n');
    console.log('ID:', res.data.id);
    console.log('Número:', res.data.processNumber);
    console.log('Cliente:', res.data.client?.name);
    console.log('Tribunal:', res.data.court);
    console.log('Assunto:', res.data.subject);
    console.log('Status:', res.data.status);
    console.log('Valor:', res.data.value);
    console.log('Link:', res.data.linkProcesso);

  } catch (error) {
    console.log('❌ ERRO AO CRIAR PROCESSO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

createSpecificProcess().catch(console.error);
