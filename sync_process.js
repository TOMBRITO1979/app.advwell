const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function syncProcess() {
  console.log('🔄 SINCRONIZANDO PROCESSO COM DATAJUD\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  const caseId = '72f42b9b-8343-4faf-887b-1ea63e2648c1';

  console.log('📡 Buscando dados do processo 0024925-24.2020.8.19.0206 no DataJud...\n');

  try {
    const res = await api.post(`/cases/${caseId}/sync`);

    console.log('✅ SINCRONIZAÇÃO CONCLUÍDA!\n');
    console.log('Processo:', res.data.processNumber);
    console.log('Tribunal:', res.data.court);
    console.log('Assunto:', res.data.subject);
    console.log('Última Sincronização:', new Date(res.data.lastSyncedAt).toLocaleString('pt-BR'));
    console.log('\n📋 Movimentos encontrados:', res.data.movements?.length || 0);

    if (res.data.movements && res.data.movements.length > 0) {
      console.log('\n🔹 Últimos 5 movimentos:');
      res.data.movements.slice(0, 5).forEach((mov, idx) => {
        const date = new Date(mov.date).toLocaleDateString('pt-BR');
        console.log(`\n${idx + 1}. ${date}`);
        console.log(`   ${mov.description.substring(0, 100)}${mov.description.length > 100 ? '...' : ''}`);
      });
    }

    if (res.data.ultimoAndamento) {
      console.log('\n📌 Último Andamento:');
      console.log(res.data.ultimoAndamento.substring(0, 200));
    }

  } catch (error) {
    console.log('❌ ERRO NA SINCRONIZAÇÃO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));

    if (error.response?.status === 404) {
      console.log('\n⚠️  O processo não foi encontrado no DataJud.');
      console.log('Isso pode acontecer se:');
      console.log('- O número do processo está incorreto');
      console.log('- O processo ainda não está disponível no sistema DataJud');
      console.log('- O tribunal não tem integração ativa');
    }
  }
}

syncProcess().catch(console.error);
