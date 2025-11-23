const axios = require('axios');

const API_URL = 'https://api.advwell.pro/api';
const EMAIL = 'teste.chatwoot@advwell.pro';
const PASSWORD = 'teste123';

async function testEditEvent() {
  try {
    // Login
    console.log(`🔐 Fazendo login...`);
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    }, {
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const token = loginResponse.data.token;
    console.log('✅ Login OK\n');

    // Buscar todos os eventos
    console.log('📋 Buscando eventos...');
    const eventsResponse = await axios.get(`${API_URL}/schedule?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const events = eventsResponse.data.data || eventsResponse.data.events || eventsResponse.data;
    console.log(`   Total: ${events.length} eventos\n`);

    if (events.length === 0) {
      console.log('❌ Nenhum evento encontrado');
      return;
    }

    // Pegar o primeiro evento
    const event = events[0];
    console.log('📝 Evento selecionado para edição:');
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Priority ANTES: ${event.priority}`);
    console.log(`   Type: ${event.type}`);
    console.log();

    // Tentar editar o evento
    console.log('✏️  Tentando EDITAR o evento (mudando priority para URGENTE)...\n');

    const updatePayload = {
      title: event.title,
      description: event.description || '',
      type: event.type,
      priority: 'URGENTE',
      date: event.date,
      endDate: event.endDate || null,
      clientId: event.clientId || null,
      caseId: event.caseId || null,
    };

    console.log('📤 Payload que será enviado:');
    console.log(JSON.stringify(updatePayload, null, 2));
    console.log();

    const updateResponse = await axios.put(`${API_URL}/schedule/${event.id}`, updatePayload, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    console.log('✅ Evento atualizado com sucesso!');
    console.log(`   Priority DEPOIS: ${updateResponse.data.priority}`);

  } catch (error) {
    console.error('\n❌ ERRO ao editar:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.error('\n📋 Resposta completa do erro 400:');
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error('\n📋 Request que falhou:');
      console.error('   URL:', error.config?.url);
      console.error('   Method:', error.config?.method);
      console.error('   Data:', error.config?.data);
    }
  }
}

testEditEvent();
