const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function createTestData() {
  console.log('🧪 CRIANDO DADOS DE TESTE PARA ADMINISTRADOR - COSTA\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  const results = {
    clientes: 0,
    processos: 0,
    financeiro: 0,
    agenda: 0,
    tarefas: 0,
    contasPagar: 0
  };

  // 1. Criar Clientes
  console.log('📋 Criando clientes...');
  const clientes = [
    { name: 'João Silva Santos', cpf: '12345678901', email: 'joao.silva@email.com', phone: '21987654321' },
    { name: 'Maria Oliveira Costa', cpf: '98765432109', email: 'maria.oliveira@email.com', phone: '21987654322' },
    { name: 'Pedro Souza Lima', cpf: '45678912345', email: 'pedro.souza@email.com', phone: '21987654323' },
    { name: 'Ana Paula Ferreira', cpf: '78912345678', email: 'ana.ferreira@email.com', phone: '21987654324' },
    { name: 'Carlos Alberto Mendes', cpf: '32165498712', email: 'carlos.mendes@email.com', phone: '21987654325' },
    { name: 'Empresa XYZ Ltda', cpf: '12345678000199', email: 'contato@empresaxyz.com.br', phone: '2133334444' },
    { name: 'Comércio ABC ME', cpf: '98765432000188', email: 'contato@comercioabc.com.br', phone: '2133335555' },
  ];

  const clientesIds = [];
  for (const cliente of clientes) {
    try {
      const res = await api.post('/clients', cliente);
      clientesIds.push(res.data.id);
      results.clientes++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar ${cliente.name}`);
    }
  }
  console.log(`✅ ${results.clientes} clientes criados\n`);

  // 2. Criar Processos
  console.log('⚖️  Criando processos...');
  const processos = [
    { clientId: clientesIds[0], processNumber: '0001234-56.2024.8.19.0001', court: 'TJRJ', subject: 'Ação de Cobrança', status: 'ACTIVE', value: 25000 },
    { clientId: clientesIds[1], processNumber: '0007890-12.2024.8.19.0001', court: 'TJRJ', subject: 'Ação Trabalhista', status: 'ACTIVE', value: 50000 },
    { clientId: clientesIds[2], processNumber: '0003456-78.2023.8.19.0002', court: 'TJRJ', subject: 'Divórcio Consensual', status: 'ACTIVE' },
    { clientId: clientesIds[3], processNumber: '0009876-54.2024.8.19.0003', court: 'TJRJ', subject: 'Indenização por Danos Morais', status: 'ACTIVE', value: 100000 },
    { clientId: clientesIds[4], processNumber: '0002468-13.2024.8.19.0001', court: 'TJRJ', subject: 'Execução Fiscal', status: 'ACTIVE', value: 35000 },
    { clientId: clientesIds[5], processNumber: '0005555-66.2023.8.19.0004', court: 'TJRJ', subject: 'Recuperação Judicial', status: 'ACTIVE' },
  ];

  const processosIds = [];
  for (const processo of processos) {
    try {
      const res = await api.post('/cases', processo);
      processosIds.push(res.data.id);
      results.processos++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar processo ${processo.processNumber}`);
    }
  }
  console.log(`✅ ${results.processos} processos criados\n`);

  // 3. Criar Transações Financeiras
  console.log('💰 Criando transações financeiras...');
  const transacoes = [
    { clientId: clientesIds[0], type: 'INCOME', description: 'Honorários - Ação de Cobrança', amount: 5000, date: '2024-11-01' },
    { clientId: clientesIds[1], type: 'INCOME', description: 'Honorários - Ação Trabalhista', amount: 8000, date: '2024-11-05' },
    { clientId: clientesIds[2], type: 'INCOME', description: 'Honorários - Divórcio', amount: 3000, date: '2024-11-10' },
    { clientId: clientesIds[3], type: 'INCOME', description: 'Honorários - Indenização', amount: 15000, date: '2024-11-15' },
    { clientId: clientesIds[0], type: 'EXPENSE', description: 'Custas Processuais', amount: 500, date: '2024-11-20' },
  ];

  for (const transacao of transacoes) {
    try {
      await api.post('/financial', transacao);
      results.financeiro++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar transação`);
    }
  }
  console.log(`✅ ${results.financeiro} transações criadas\n`);

  // 4. Criar Eventos de Agenda
  console.log('📅 Criando eventos de agenda...');
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const proximaSemana = new Date(hoje);
  proximaSemana.setDate(proximaSemana.getDate() + 7);

  const eventos = [
    { title: 'Audiência - João Silva', type: 'AUDIENCIA', date: amanha.toISOString(), clientId: clientesIds[0], caseId: processosIds[0] },
    { title: 'Reunião com Cliente Maria', type: 'COMPROMISSO', date: proximaSemana.toISOString(), clientId: clientesIds[1] },
    { title: 'Prazo - Contestação', type: 'PRAZO', date: amanha.toISOString(), caseId: processosIds[1] },
    { title: 'Google Meet - Análise de Caso', type: 'GOOGLE_MEET', date: proximaSemana.toISOString(), clientId: clientesIds[2] },
  ];

  for (const evento of eventos) {
    try {
      await api.post('/schedule', evento);
      results.agenda++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar evento ${evento.title}`);
    }
  }
  console.log(`✅ ${results.agenda} eventos de agenda criados\n`);

  // 5. Criar Tarefas (To Do)
  console.log('✅ Criando tarefas...');
  const tarefas = [
    { title: 'Revisar petição inicial', type: 'TAREFA', date: hoje.toISOString(), description: 'Revisar petição antes de protocolar', clientId: clientesIds[0] },
    { title: 'Preparar documentação para audiência', type: 'TAREFA', date: amanha.toISOString(), caseId: processosIds[0] },
    { title: 'Atualizar cliente sobre andamento', type: 'TAREFA', date: hoje.toISOString(), clientId: clientesIds[1] },
    { title: 'Pesquisar jurisprudência', type: 'TAREFA', date: proximaSemana.toISOString(), caseId: processosIds[2] },
  ];

  for (const tarefa of tarefas) {
    try {
      await api.post('/schedule', tarefa);
      results.tarefas++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar tarefa ${tarefa.title}`);
    }
  }
  console.log(`✅ ${results.tarefas} tarefas criadas\n`);

  // 6. Criar Contas a Pagar
  console.log('💳 Criando contas a pagar...');
  const contasPagar = [
    { supplier: 'Energia Elétrica', description: 'Conta de luz - Novembro', amount: 450, dueDate: proximaSemana.toISOString(), category: 'Utilidades' },
    { supplier: 'Internet Banda Larga', description: 'Mensalidade Internet', amount: 299, dueDate: amanha.toISOString(), category: 'Comunicação' },
    { supplier: 'Aluguel Escritório', description: 'Aluguel - Novembro', amount: 3500, dueDate: hoje.toISOString(), category: 'Imóvel' },
  ];

  for (const conta of contasPagar) {
    try {
      await api.post('/accounts-payable', conta);
      results.contasPagar++;
    } catch (error) {
      console.log(`  ⚠️  Erro ao criar conta ${conta.supplier}`);
    }
  }
  console.log(`✅ ${results.contasPagar} contas a pagar criadas\n`);

  // Resumo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO DOS DADOS CRIADOS:\n');
  console.log(`👥 Clientes: ${results.clientes}`);
  console.log(`⚖️  Processos: ${results.processos}`);
  console.log(`💰 Transações Financeiras: ${results.financeiro}`);
  console.log(`📅 Eventos de Agenda: ${results.agenda}`);
  console.log(`✅ Tarefas (To Do): ${results.tarefas}`);
  console.log(`💳 Contas a Pagar: ${results.contasPagar}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createTestData().catch(console.error);
