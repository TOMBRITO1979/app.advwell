const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function createProcessForSuperAdmin() {
  console.log('🧪 CRIANDO PROCESSO PARA SUPERADMIN\n');

  // Login como SUPERADMIN
  const loginRes = await api.post('/auth/login', {
    email: 'wasolutionscorp@gmail.com',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login como SUPERADMIN OK\n');

  // Buscar um cliente da empresa do superadmin
  const clientsRes = await api.get('/clients?limit=1');
  let clientId;

  if (clientsRes.data.data && clientsRes.data.data.length > 0) {
    clientId = clientsRes.data.data[0].id;
    console.log('✅ Cliente encontrado:', clientsRes.data.data[0].name);
  } else {
    // Criar um cliente se não existir
    console.log('⚠️  Nenhum cliente encontrado. Criando cliente...');
    const newClient = await api.post('/clients', {
      name: 'Cliente Teste Processo',
      phone: '21999999999',
      cpf: '',
      email: '',
      address: '',
      birthDate: '',
      notes: ''
    });
    clientId = newClient.data.id;
    console.log('✅ Cliente criado:', newClient.data.name);
  }

  console.log('   ID:', clientId, '\n');

  // Criar processo
  console.log('📝 Criando processo 0024925-24.2020.8.19.0206...\n');

  try {
    const res = await api.post('/cases', {
      clientId: clientId,
      processNumber: '0024925-24.2020.8.19.0206',
      court: 'TJRJ',
      subject: 'Processo de Teste',
      value: '',
      status: 'ACTIVE',
      notes: 'Processo cadastrado via script',
      informarCliente: '',
      linkProcesso: ''
    });

    console.log('✅ PROCESSO CRIADO COM SUCESSO!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:', res.data.id);
    console.log('Número:', res.data.processNumber);
    console.log('Cliente:', res.data.client?.name);
    console.log('Tribunal:', res.data.court);
    console.log('Status:', res.data.status);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Sincronizar com DataJud
    console.log('🔄 Sincronizando com DataJud...\n');

    try {
      const syncRes = await api.post(`/cases/${res.data.id}/sync`);
      console.log('✅ Sincronização concluída!');
      console.log('Movimentos encontrados:', syncRes.data.movements?.length || 0);
      if (syncRes.data.ultimoAndamento) {
        console.log('Último andamento:', syncRes.data.ultimoAndamento.substring(0, 100));
      }
    } catch (syncError) {
      console.log('⚠️  Erro na sincronização:', syncError.response?.data?.error || syncError.message);
    }

  } catch (error) {
    console.log('❌ ERRO AO CRIAR PROCESSO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

createProcessForSuperAdmin().catch(console.error);
