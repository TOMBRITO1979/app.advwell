const axios = require('axios');
const { execSync } = require('child_process');

const API_URL = 'https://api.advwell.pro/api';

// User credentials
const EMAIL = 'teste.chatwoot@advwell.pro';
const PASSWORD = 'teste123';

async function checkDatabase(eventId, message) {
  console.log(`\n📊 ${message}`);
  try {
    const result = execSync(
      `docker exec $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c "SELECT id, title, priority, (SELECT COUNT(*) FROM event_assignments WHERE \\"eventId\\" = '${eventId}') as assigned_users FROM schedule_events WHERE id = '${eventId}';"`,
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch (error) {
    console.error('Erro ao verificar banco:', error.message);
  }
}

async function test() {
  try {
    // Login
    console.log(`\n🔐 Fazendo login com ${EMAIL}...`);
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK');

    // TESTE 1: Criar novo evento COM priority
    console.log('\n📝 TESTE 1: Criando novo evento com priority=ALTA...');
    const createResponse = await axios.post(`${API_URL}/schedule`, {
      title: 'Teste Priority COMPLETO',
      type: 'TAREFA',
      priority: 'ALTA',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const eventId = createResponse.data.id;
    console.log('✅ Evento criado:');
    console.log(`   ID: ${eventId}`);
    console.log(`   Title: ${createResponse.data.title}`);
    console.log(`   Priority retornado pela API: ${createResponse.data.priority}`);

    // TESTE 2: Verificar banco DEPOIS da criação
    await checkDatabase(eventId, 'Verificando banco DEPOIS da criação');

    // TESTE 3: GET do evento via API
    console.log('\n🔍 TESTE 2: Buscando evento via API (GET)...');
    const getResponse = await axios.get(`${API_URL}/schedule/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ GET Response:');
    console.log(`   Priority retornado: ${getResponse.data.priority}`);
    console.log(`   Assigned Users: ${getResponse.data.assignedUsers?.length || 0}`);

    if (getResponse.data.priority === null || getResponse.data.priority === undefined) {
      console.log('\n⚠️  PROBLEMA: API retorna priority=null!');
      console.log('   Banco tem o valor, mas Prisma Client não retorna.');
    } else if (getResponse.data.priority === 'ALTA') {
      console.log('\n✅ Priority retornado CORRETAMENTE!');
    }

    // TESTE 4: Buscar usuários para atribuir
    console.log('\n👥 Buscando usuários da empresa...');
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    // Handle both array and object response formats
    const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data.users || [];
    const userIds = users.slice(0, 2).map(u => u.id);
    console.log(`   Encontrados ${userIds.length} usuários para atribuir`);

    // TESTE 5: PUT para editar o evento
    console.log('\n✏️  TESTE 3: Editando evento (mudando priority para URGENTE e adicionando usuários)...');
    const putResponse = await axios.put(`${API_URL}/schedule/${eventId}`, {
      priority: 'URGENTE',
      assignedUserIds: userIds,
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ PUT Response:');
    console.log(`   Priority atualizado: ${putResponse.data.priority}`);
    console.log(`   Assigned Users: ${putResponse.data.assignedUsers?.length || 0}`);

    // TESTE 6: Verificar banco DEPOIS do PUT
    await checkDatabase(eventId, 'Verificando banco DEPOIS do PUT');

    // TESTE 7: GET novamente para confirmar mudanças
    console.log('\n🔍 TESTE 4: GET final para confirmar mudanças...');
    const finalGetResponse = await axios.get(`${API_URL}/schedule/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ GET Final Response:');
    console.log(`   Priority: ${finalGetResponse.data.priority}`);
    console.log(`   Assigned Users: ${finalGetResponse.data.assignedUsers?.length || 0}`);

    // RESULTADO FINAL
    console.log('\n' + '='.repeat(60));
    const priorityOk = finalGetResponse.data.priority === 'URGENTE';
    const usersOk = finalGetResponse.data.assignedUsers?.length === 2;

    if (priorityOk && usersOk) {
      console.log('🎉 TESTE COMPLETO PASSOU! Sistema funcionando 100%!');
      console.log('   ✅ Priority: URGENTE (correto)');
      console.log(`   ✅ Usuários atribuídos: ${finalGetResponse.data.assignedUsers.length} (correto)`);
    } else {
      console.log('⚠️  TESTE FALHOU! Verificar problemas:');
      if (!priorityOk) {
        console.log(`   ❌ Priority esperado: URGENTE, recebido: ${finalGetResponse.data.priority}`);
      }
      if (!usersOk) {
        console.log(`   ❌ Usuários esperado: 2, recebido: ${finalGetResponse.data.assignedUsers?.length || 0}`);
      }
    }
    console.log('='.repeat(60));

    // TESTE 8: Limpar - deletar o evento de teste
    console.log('\n🗑️  Limpando: deletando evento de teste...');
    await axios.delete(`${API_URL}/schedule/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    console.log('✅ Evento de teste deletado');

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('   Detalhes do erro 400:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
