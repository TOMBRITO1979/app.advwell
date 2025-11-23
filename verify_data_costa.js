const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function verifyData() {
  console.log('🔍 VERIFICANDO DADOS NO BANCO - ADMINISTRADOR COSTA\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  // Verificar Clientes
  const clientsRes = await api.get('/clients?limit=100');
  console.log(`👥 CLIENTES: ${clientsRes.data.total || clientsRes.data.data.length}`);
  if (clientsRes.data.data.length > 0) {
    clientsRes.data.data.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} ${c.cpf ? `(${c.cpf})` : ''}`);
    });
    if (clientsRes.data.data.length > 5) {
      console.log(`   ... e mais ${clientsRes.data.data.length - 5} clientes`);
    }
  }
  console.log('');

  // Verificar Processos
  const casesRes = await api.get('/cases?limit=100');
  console.log(`⚖️  PROCESSOS: ${casesRes.data.total || casesRes.data.data.length}`);
  if (casesRes.data.data.length > 0) {
    casesRes.data.data.slice(0, 5).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.processNumber} - ${c.subject}`);
    });
    if (casesRes.data.data.length > 5) {
      console.log(`   ... e mais ${casesRes.data.data.length - 5} processos`);
    }
  }
  console.log('');

  // Verificar Transações Financeiras
  const financialRes = await api.get('/financial?limit=100');
  console.log(`💰 TRANSAÇÕES FINANCEIRAS: ${financialRes.data.data.length}`);
  if (financialRes.data.data.length > 0) {
    const summary = financialRes.data.summary;
    console.log(`   Receitas: R$ ${summary.totalIncome.toFixed(2)}`);
    console.log(`   Despesas: R$ ${summary.totalExpense.toFixed(2)}`);
    console.log(`   Saldo: R$ ${summary.balance.toFixed(2)}`);
  }
  console.log('');

  // Verificar Eventos de Agenda
  const scheduleRes = await api.get('/schedule?limit=100');
  console.log(`📅 EVENTOS DE AGENDA: ${scheduleRes.data.data.length}`);
  if (scheduleRes.data.data.length > 0) {
    const agendaOnly = scheduleRes.data.data.filter(e => e.type !== 'TAREFA');
    console.log(`   Compromissos/Audiências/Prazos: ${agendaOnly.length}`);
    agendaOnly.slice(0, 3).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.title} (${e.type})`);
    });
  }
  console.log('');

  // Verificar Tarefas (To Do)
  const todosRes = await api.get('/schedule?type=TAREFA&limit=100');
  console.log(`✅ TAREFAS (TO DO): ${todosRes.data.data.length}`);
  if (todosRes.data.data.length > 0) {
    todosRes.data.data.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.title} ${t.completed ? '✓' : '○'}`);
    });
  }
  console.log('');

  // Verificar Contas a Pagar
  const accountsRes = await api.get('/accounts-payable?limit=100');
  console.log(`💳 CONTAS A PAGAR: ${accountsRes.data.total || accountsRes.data.data.length}`);
  if (accountsRes.data.data.length > 0) {
    accountsRes.data.data.slice(0, 3).forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.supplier} - R$ ${a.amount.toFixed(2)} (${a.status})`);
    });
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VERIFICAÇÃO COMPLETA!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

verifyData().catch(console.error);
