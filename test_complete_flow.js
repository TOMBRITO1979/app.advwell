const axios = require('axios');
const { execSync } = require('child_process');

const API_URL = 'https://api.advwell.pro/api';
const EVENT_ID = 'ab7dfde1-877b-4c8b-a2f5-ff1140d96743';

// Usuários para tentar
const USERS = [
  { email: 'we@gmail.com', password: 'teste123' },
  { email: 'teste.chatwoot@advwell.pro', password: 'teste123' },
];

async function checkDatabase(message) {
  console.log(`\n📊 ${message}`);
  try {
    const result = execSync(
      `docker exec $(docker ps -q -f name=advtom_postgres) psql -U postgres -d advtom -c "SELECT id, title, priority, (SELECT COUNT(*) FROM event_assignments WHERE \\"eventId\\" = '${EVENT_ID}') as assigned_users FROM schedule_events WHERE id = '${EVENT_ID}';"`,
      { encoding: 'utf-8' }
    );
    console.log(result);
  } catch (error) {
    console.error('Erro ao verificar banco:', error.message);
  }
}

async function test() {
  let token = null;

  // Tentar login com diferentes usuários
  for (const user of USERS) {
    try {
      console.log(`\n🔐 Tentando login com ${user.email}...`);
      const response = await axios.post(`${API_URL}/auth/login`, user, {
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      token = response.data.token;
      console.log(`✅ Login bem-sucedido com ${user.email}`);
      break;
    } catch (error) {
      console.log(`❌ Falha com ${user.email}: ${error.response?.data?.error || error.message}`);
    }
  }

  if (!token) {
    console.log('\n❌ Não foi possível fazer login com nenhum usuário. Abortando.');
    return;
  }

  try {
    // TESTE 1: Verificar banco ANTES do GET
    await checkDatabase('Verificando banco ANTES do GET');

    // TESTE 2: GET do evento via API
    console.log('\n🔍 TESTE GET: Buscando evento via API...');
    const getResponse = await axios.get(`${API_URL}/schedule/${EVENT_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ GET Response:');
    console.log(`   ID: ${getResponse.data.id}`);
    console.log(`   Title: ${getResponse.data.title}`);
    console.log(`   Priority retornado pela API: ${getResponse.data.priority}`);
    console.log(`   Assigned Users: ${getResponse.data.assignedUsers?.length || 0}`);

    if (getResponse.data.priority === null || getResponse.data.priority === undefined) {
      console.log('\n⚠️  PROBLEMA DETECTADO: API retorna priority=null mesmo que banco tenha ALTA!');
      console.log('   Isso indica que o Prisma Client não inclui o campo priority.');
    } else if (getResponse.data.priority === 'ALTA') {
      console.log('\n✅ SUCESSO: Priority retornado corretamente!');
    }

    // TESTE 3: PUT para editar o evento
    console.log('\n✏️  TESTE PUT: Editando evento (mudando priority para URGENTE e adicionando 2 usuários)...');

    // Buscar IDs de usuários da mesma empresa
    const usersResponse = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const userIds = usersResponse.data.slice(0, 2).map(u => u.id);
    console.log(`   Usuários para atribuir: ${userIds.length}`);

    const putResponse = await axios.put(`${API_URL}/schedule/${EVENT_ID}`, {
      priority: 'URGENTE',
      assignedUserIds: userIds,
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ PUT Response:');
    console.log(`   Priority atualizado: ${putResponse.data.priority}`);
    console.log(`   Assigned Users: ${putResponse.data.assignedUsers?.length || 0}`);

    // TESTE 4: Verificar banco DEPOIS do PUT
    await checkDatabase('Verificando banco DEPOIS do PUT');

    // TESTE 5: GET novamente para confirmar mudanças
    console.log('\n🔍 TESTE GET FINAL: Buscando evento atualizado...');
    const finalGetResponse = await axios.get(`${API_URL}/schedule/${EVENT_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ GET Final Response:');
    console.log(`   Priority: ${finalGetResponse.data.priority}`);
    console.log(`   Assigned Users: ${finalGetResponse.data.assignedUsers?.length || 0}`);

    // RESULTADO FINAL
    console.log('\n' + '='.repeat(60));
    if (finalGetResponse.data.priority === 'URGENTE' && finalGetResponse.data.assignedUsers?.length === 2) {
      console.log('🎉 TESTE COMPLETO PASSOU! Sistema funcionando 100%!');
      console.log('   ✅ Priority: URGENTE (correto)');
      console.log(`   ✅ Usuários atribuídos: ${finalGetResponse.data.assignedUsers.length} (correto)`);
    } else {
      console.log('⚠️  TESTE FALHOU! Verificar problemas:');
      if (finalGetResponse.data.priority !== 'URGENTE') {
        console.log(`   ❌ Priority esperado: URGENTE, recebido: ${finalGetResponse.data.priority}`);
      }
      if (finalGetResponse.data.assignedUsers?.length !== 2) {
        console.log(`   ❌ Usuários esperado: 2, recebido: ${finalGetResponse.data.assignedUsers?.length || 0}`);
      }
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('   Detalhes do erro 400:', error.response.data);
    }
  }
}

test();
