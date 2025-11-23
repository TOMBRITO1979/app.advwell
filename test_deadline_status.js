const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

async function testCreateCaseWithDeadline() {
  try {
    // Login
    console.log('🔐 Fazendo login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@mendespereira.com.br',
      password: 'Teste123!'
    });

    const token = loginRes.data.token;
    console.log('✅ Login bem-sucedido');

    // Configurar axios com token
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Buscar primeiro cliente
    console.log('\n📋 Buscando clientes...');
    const clientsRes = await api.get('/clients');
    const clients = clientsRes.data.data || clientsRes.data;

    if (!clients || clients.length === 0) {
      console.log('❌ Nenhum cliente encontrado. Criando cliente de teste...');

      const newClient = await api.post('/clients', {
        name: 'Cliente Teste Deadline',
        cpf: '12345678901',
        email: 'teste@deadline.com',
        phone: '11999999999'
      });

      console.log('✅ Cliente criado:', newClient.data.name);
      var clientId = newClient.data.id;
    } else {
      var clientId = clients[0].id;
      console.log('✅ Usando cliente:', clients[0].name);
    }

    // Criar processo com status e deadline
    console.log('\n📝 Criando processo com status e deadline...');
    const newCase = await api.post('/cases', {
      clientId: clientId,
      processNumber: `${Date.now()}-TEST`,
      court: 'TJSP',
      subject: 'Teste de Status e Deadline',
      value: 5000.50,
      status: 'PENDENTE',
      deadline: '2025-12-31T23:59:59.000Z',
      notes: 'Processo criado para testar os campos status e deadline',
      informarCliente: 'Teste de criação com prazo'
    });

    console.log('✅ Processo criado com sucesso!');
    console.log('\nDetalhes do processo:');
    console.log('  ID:', newCase.data.id);
    console.log('  Número:', newCase.data.processNumber);
    console.log('  Status:', newCase.data.status);
    console.log('  Deadline:', newCase.data.deadline);
    console.log('  Tribunal:', newCase.data.court);
    console.log('  Assunto:', newCase.data.subject);

    // Verificar se os campos foram salvos corretamente
    if (newCase.data.status === 'PENDENTE' && newCase.data.deadline) {
      console.log('\n✅ TESTE PASSOU! Os campos status e deadline foram aceitos e salvos.');
    } else {
      console.log('\n❌ TESTE FALHOU! Campos não foram salvos corretamente.');
      console.log('Status esperado: PENDENTE, recebido:', newCase.data.status);
      console.log('Deadline esperado: 2025-12-31, recebido:', newCase.data.deadline);
    }

    // Testar atualização
    console.log('\n🔄 Testando atualização de status e deadline...');
    const updatedCase = await api.put(`/cases/${newCase.data.id}`, {
      status: 'ACTIVE',
      deadline: '2026-01-15T23:59:59.000Z',
      notes: 'Atualizado para testar mudança de status e deadline'
    });

    console.log('✅ Processo atualizado com sucesso!');
    console.log('  Novo Status:', updatedCase.data.status);
    console.log('  Novo Deadline:', updatedCase.data.deadline);

    if (updatedCase.data.status === 'ACTIVE' && updatedCase.data.deadline) {
      console.log('\n✅ TESTE DE ATUALIZAÇÃO PASSOU!');
    } else {
      console.log('\n❌ TESTE DE ATUALIZAÇÃO FALHOU!');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    process.exit(1);
  }
}

testCreateCaseWithDeadline();
