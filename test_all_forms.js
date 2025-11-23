const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testAllForms() {
  console.log('🧪 TESTANDO TODOS OS FORMULÁRIOS COM CAMPOS VAZIOS\n');

  try {
    // Login
    console.log('1️⃣  Login...');
    const loginRes = await api.post('/auth/login', {
      email: 'admin@costaassociados.adv.br',
      password: 'Teste123!'
    });
    const token = loginRes.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ Login OK\n');

    // Test 1: Cliente com campos opcionais vazios
    console.log('2️⃣  Teste: Cliente com campos vazios...');
    try {
      const clientRes = await api.post('/clients', {
        name: 'Cliente Teste Validação',
        cpf: '',
        email: '',
        phone: '21999999999',
        address: '',
        birthDate: '',
        notes: ''
      });
      console.log('✅ PASSOU! Cliente ID:', clientRes.data.id);
      const testClientId = clientRes.data.id;

      // Test 2: Processo com campos vazios
      console.log('\n3️⃣  Teste: Processo com campos vazios...');
      try {
        const caseRes = await api.post('/cases', {
          clientId: testClientId,
          processNumber: `TEST-${Date.now()}-20.2025.8.19.0001`,
          court: 'TJRJ',
          subject: 'Teste de Validação',
          value: '',
          status: '',
          notes: '',
          informarCliente: '',
          linkProcesso: ''
        });
        console.log('✅ PASSOU! Processo ID:', caseRes.data.id);

        // Test 3: Transação financeira
        console.log('\n4️⃣  Teste: Transação financeira...');
        try {
          const financialRes = await api.post('/financial', {
            clientId: testClientId,
            type: 'INCOME',
            description: 'Honorários teste',
            amount: 1000,
            date: new Date().toISOString()
          });
          console.log('✅ PASSOU! Transação ID:', financialRes.data.id);
        } catch (error) {
          console.log('❌ FALHOU!');
          console.log('Status:', error.response?.status);
          console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
        }

        // Test 4: Evento de agenda com campos opcionais vazios
        console.log('\n5️⃣  Teste: Evento de agenda...');
        try {
          const scheduleRes = await api.post('/schedule', {
            title: 'Audiência Teste',
            date: new Date(Date.now() + 86400000).toISOString(), // Amanhã
            description: '',
            type: 'AUDIENCIA',
            clientId: testClientId,
            caseId: '',
            endDate: ''
          });
          console.log('✅ PASSOU! Evento ID:', scheduleRes.data.id);
        } catch (error) {
          console.log('❌ FALHOU!');
          console.log('Status:', error.response?.status);
          console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
        }

      } catch (error) {
        console.log('❌ FALHOU!');
        console.log('Status:', error.response?.status);
        console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
      }

    } catch (error) {
      console.log('❌ FALHOU!');
      console.log('Status:', error.response?.status);
      console.log('Erro:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS!');

  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
  }
}

testAllForms().catch(console.error);
