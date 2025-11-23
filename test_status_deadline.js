const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';

async function testStatusAndDeadline() {
  try {
    console.log('=== TESTE: Status PENDENTE e Prazo ===\n');

    // 1. Login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@joyinchat.com.br',
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✓ Login realizado com sucesso\n');

    // Config do axios com token
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 2. Buscar clientes
    console.log('2. Buscando clientes...');
    const clientsResponse = await api.get('/clients');
    const clients = clientsResponse.data.data;

    if (clients.length === 0) {
      console.log('✗ Nenhum cliente encontrado');
      return;
    }

    const firstClient = clients[0];
    console.log(`✓ Cliente encontrado: ${firstClient.name} (ID: ${firstClient.id})\n`);

    // 3. Criar processo com status PENDENTE e prazo
    console.log('3. Criando processo com status PENDENTE e prazo...');
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30); // 30 dias a partir de hoje

    const processNumber = `0000${Math.floor(Math.random() * 10000)}${Math.floor(Math.random() * 100000000)}`;

    const createResponse = await api.post('/cases', {
      clientId: firstClient.id,
      processNumber: processNumber,
      court: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      subject: 'Teste de Status PENDENTE e Prazo',
      status: 'PENDENTE',
      deadline: deadline.toISOString().split('T')[0],
      value: 15000.00,
      notes: 'Processo criado para testar status PENDENTE e campo de prazo',
      informarCliente: 'Este é um processo de teste com status pendente e prazo definido.'
    });

    const newCase = createResponse.data;
    console.log(`✓ Processo criado com sucesso!`);
    console.log(`  - ID: ${newCase.id}`);
    console.log(`  - Número: ${newCase.processNumber}`);
    console.log(`  - Status: ${newCase.status}`);
    console.log(`  - Prazo: ${newCase.deadline ? new Date(newCase.deadline).toLocaleDateString('pt-BR') : 'Não definido'}\n`);

    // 4. Buscar o processo criado
    console.log('4. Buscando processo criado...');
    const getCaseResponse = await api.get(`/cases/${newCase.id}`);
    const caseDetail = getCaseResponse.data;

    console.log('✓ Detalhes do processo:');
    console.log(`  - Status: ${caseDetail.status}`);
    console.log(`  - Prazo: ${caseDetail.deadline ? new Date(caseDetail.deadline).toLocaleDateString('pt-BR') : 'Não definido'}`);
    console.log(`  - Cliente: ${caseDetail.client.name}`);
    console.log(`  - Assunto: ${caseDetail.subject}\n`);

    // 5. Listar todos os processos e verificar badges
    console.log('5. Listando processos para verificar badges de status...');
    const listResponse = await api.get('/cases');
    const cases = listResponse.data.data;

    console.log(`✓ Total de processos: ${cases.length}`);
    console.log('\nProcessos com diferentes status:');

    const statusCount = {};
    cases.forEach(c => {
      statusCount[c.status] = (statusCount[c.status] || 0) + 1;
    });

    Object.entries(statusCount).forEach(([status, count]) => {
      const badge = {
        PENDENTE: '🟡 Pendente (amarelo)',
        ACTIVE: '🟢 Ativo (verde)',
        ARCHIVED: '⚫ Arquivado (cinza)',
        FINISHED: '🔵 Finalizado (azul)'
      }[status] || status;
      console.log(`  - ${badge}: ${count} processo(s)`);
    });

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\nVerifique na interface:');
    console.log('- Badge amarelo para status PENDENTE');
    console.log('- Badge verde para status ACTIVE');
    console.log('- Badge cinza para status ARCHIVED');
    console.log('- Badge azul para status FINISHED');
    console.log('- Coluna "Prazo" mostrando a data em formato DD/MM/YYYY');

  } catch (error) {
    console.error('\n✗ ERRO:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Detalhes:', error.response.data.details);
    }
  }
}

testStatusAndDeadline();
