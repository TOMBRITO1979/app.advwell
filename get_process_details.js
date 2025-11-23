const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function getProcessDetails() {
  console.log('📄 BUSCANDO DETALHES DO PROCESSO\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  const caseId = '72f42b9b-8343-4faf-887b-1ea63e2648c1';

  try {
    const res = await api.get(`/cases/${caseId}`);
    const processo = res.data;

    console.log('📋 DETALHES DO PROCESSO\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Número:', processo.processNumber);
    console.log('Tribunal:', processo.court);
    console.log('Assunto:', processo.subject);
    console.log('Status:', processo.status);
    console.log('Cliente:', processo.client?.name);

    if (processo.lastSyncedAt) {
      const syncDate = new Date(processo.lastSyncedAt);
      console.log('Última Sincronização:', syncDate.toLocaleString('pt-BR'));
    }

    console.log('\n📊 ESTATÍSTICAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Total de Movimentos:', processo.movements?.length || 0);

    if (processo.ultimoAndamento) {
      console.log('\n📌 ÚLTIMO ANDAMENTO');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(processo.ultimoAndamento);
    }

    if (processo.movements && processo.movements.length > 0) {
      console.log('\n📑 MOVIMENTOS RECENTES (5 mais recentes)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Ordenar por data decrescente
      const sortedMovements = [...processo.movements].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      sortedMovements.slice(0, 5).forEach((mov, idx) => {
        if (mov.date) {
          const date = new Date(mov.date);
          console.log(`${idx + 1}. ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}`);
        } else {
          console.log(`${idx + 1}. Data não disponível`);
        }
        console.log(`   ${mov.description || 'Sem descrição'}`);
        console.log('');
      });

      console.log(`... e mais ${processo.movements.length - 5} movimentos anteriores.`);
    }

  } catch (error) {
    console.log('❌ ERRO AO BUSCAR PROCESSO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

getProcessDetails().catch(console.error);
