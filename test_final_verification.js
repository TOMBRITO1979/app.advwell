const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

async function testFinalVerification() {
  try {
    console.log('========================================');
    console.log('TESTE FINAL DE VERIFICAÇÃO');
    console.log('========================================\n');

    // Login
    console.log('1. Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@mendespereira.com.br',
      password: 'Teste123!'
    });

    const token = loginRes.data.token;
    console.log('   ✅ Login bem-sucedido\n');

    const api = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Buscar clientes
    console.log('2. Buscando clientes...');
    const clientsRes = await api.get('/clients');
    const clients = clientsRes.data.data || clientsRes.data;
    const clientId = clients[0].id;
    console.log(`   ✅ Cliente encontrado: ${clients[0].name}\n`);

    // Criar processo com todos os campos
    console.log('3. Criando processo com status=PENDENTE e deadline...');
    const newCase = await api.post('/cases', {
      clientId: clientId,
      processNumber: `FINAL-TEST-${Date.now()}`,
      court: 'TJRJ',
      subject: 'Teste Final de Status e Deadline',
      value: 10000.00,
      status: 'PENDENTE',
      deadline: '2025-12-15T18:00:00.000Z',
      notes: 'Teste final de verificação',
      informarCliente: 'Cliente informado sobre o prazo'
    });

    console.log('   ✅ Processo criado:');
    console.log(`      - ID: ${newCase.data.id}`);
    console.log(`      - Número: ${newCase.data.processNumber}`);
    console.log(`      - Status: ${newCase.data.status}`);
    console.log(`      - Deadline: ${newCase.data.deadline}`);
    console.log(`      - Tribunal: ${newCase.data.court}`);
    console.log(`      - Valor: R$ ${newCase.data.value}\n`);

    // Atualizar status e deadline
    console.log('4. Atualizando status para ACTIVE e mudando deadline...');
    const updatedCase = await api.put(`/cases/${newCase.data.id}`, {
      status: 'ACTIVE',
      deadline: '2026-03-20T12:00:00.000Z',
      notes: 'Processo atualizado - agora em andamento'
    });

    console.log('   ✅ Processo atualizado:');
    console.log(`      - Status: ${updatedCase.data.status}`);
    console.log(`      - Deadline: ${updatedCase.data.deadline}\n`);

    // Buscar processo novamente para confirmar
    console.log('5. Buscando processo para confirmar dados...');
    const fetchedCase = await api.get(`/cases/${newCase.data.id}`);

    console.log('   ✅ Processo buscado:');
    console.log(`      - Status: ${fetchedCase.data.status}`);
    console.log(`      - Deadline: ${fetchedCase.data.deadline}\n`);

    // Validações finais
    console.log('========================================');
    console.log('RESULTADO FINAL');
    console.log('========================================\n');

    const allTestsPassed =
      newCase.data.status === 'PENDENTE' &&
      newCase.data.deadline === '2025-12-15T18:00:00.000Z' &&
      updatedCase.data.status === 'ACTIVE' &&
      updatedCase.data.deadline === '2026-03-20T12:00:00.000Z' &&
      fetchedCase.data.status === 'ACTIVE' &&
      fetchedCase.data.deadline === '2026-03-20T12:00:00.000Z';

    if (allTestsPassed) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log('✅ Backend aceita campos status e deadline');
      console.log('✅ Campos são salvos corretamente no banco');
      console.log('✅ Atualizações funcionam corretamente');
      console.log('✅ Sistema está funcionando perfeitamente!\n');
      process.exit(0);
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM!');
      console.log('Verifique os detalhes acima.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.response?.data || error.message);
    process.exit(1);
  }
}

testFinalVerification();
