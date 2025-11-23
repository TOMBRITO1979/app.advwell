const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function findProcess() {
  console.log('🔍 BUSCANDO PROCESSO NA EMPRESA DO SUPERADMIN\n');

  // Login como SUPERADMIN
  const loginRes = await api.post('/auth/login', {
    email: 'wasolutionscorp@gmail.com',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login como SUPERADMIN OK\n');

  try {
    // Buscar todos os processos
    const casesRes = await api.get('/cases?limit=100');
    console.log('Total de processos encontrados:', casesRes.data.total || casesRes.data.data?.length);
    console.log('');

    if (casesRes.data.data) {
      // Procurar o processo específico
      const targetProcess = casesRes.data.data.find(c =>
        c.processNumber === '0024925-24.2020.8.19.0206' ||
        c.processNumber.includes('0024925')
      );

      if (targetProcess) {
        console.log('✅ PROCESSO ENCONTRADO!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ID:', targetProcess.id);
        console.log('Número:', targetProcess.processNumber);
        console.log('Cliente:', targetProcess.client?.name);
        console.log('Tribunal:', targetProcess.court);
        console.log('Assunto:', targetProcess.subject);
        console.log('Status:', targetProcess.status);

        if (targetProcess.lastSyncedAt) {
          const syncDate = new Date(targetProcess.lastSyncedAt);
          console.log('Última Sincronização:', syncDate.toLocaleString('pt-BR'));
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Buscar detalhes completos
        const detailsRes = await api.get(`/cases/${targetProcess.id}`);
        const details = detailsRes.data;

        console.log('📊 DETALHES COMPLETOS\n');
        console.log('Movimentos:', details.movements?.length || 0);

        if (details.ultimoAndamento) {
          console.log('\n📌 Último Andamento:');
          console.log(details.ultimoAndamento);
        }

        if (details.movements && details.movements.length > 0) {
          console.log('\n📑 5 MOVIMENTOS MAIS RECENTES:\n');
          const sorted = [...details.movements].sort((a, b) =>
            new Date(b.date || 0) - new Date(a.date || 0)
          );

          sorted.slice(0, 5).forEach((mov, idx) => {
            if (mov.date) {
              const date = new Date(mov.date);
              console.log(`${idx + 1}. ${date.toLocaleDateString('pt-BR')}`);
            } else {
              console.log(`${idx + 1}. Data não disponível`);
            }
            console.log(`   ${mov.description || 'Sem descrição'}\n`);
          });
        }

      } else {
        console.log('⚠️  Processo 0024925-24.2020.8.19.0206 não encontrado.\n');
        console.log('📋 Processos disponíveis:\n');
        casesRes.data.data.slice(0, 10).forEach((c, idx) => {
          console.log(`${idx + 1}. ${c.processNumber} - ${c.subject}`);
        });
      }
    }

  } catch (error) {
    console.log('❌ ERRO!\n');
    console.log('Status:', error.response?.status);
    console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
  }
}

findProcess().catch(console.error);
