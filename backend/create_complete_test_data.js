const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando criação de dados de teste completos...\n');

  // 1. CRIAR EMPRESA DE TESTE
  console.log('📊 Criando empresa de teste...');
  const company = await prisma.company.upsert({
    where: { email: 'teste@advwell.pro' },
    update: {},
    create: {
      name: 'Escritório AdvWell Teste',
      email: 'teste@advwell.pro',
      phone: '(21) 99999-9999',
      address: 'Rua Teste, 123',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000',
      cnpj: '12345678000199',
      active: true,
    },
  });
  console.log(`✅ Empresa criada: ${company.name} (ID: ${company.id})\n`);

  // 2. CRIAR USUÁRIOS
  console.log('👥 Criando usuários...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@advwell.pro' },
    update: {},
    create: {
      name: 'Admin Teste',
      email: 'admin@advwell.pro',
      password: await bcrypt.hash('password123', 12),
      role: 'ADMIN',
      companyId: company.id,
      active: true,
    },
  });
  console.log(`✅ Admin criado: ${adminUser.name}`);

  const regularUser = await prisma.user.upsert({
    where: { email: 'usuario@advwell.pro' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'usuario@advwell.pro',
      password: await bcrypt.hash('password123', 12),
      role: 'USER',
      companyId: company.id,
      active: true,
    },
  });
  console.log(`✅ Usuário criado: ${regularUser.name}\n`);

  // 3. CRIAR CLIENTES
  console.log('👤 Criando clientes...');
  const clients = [];
  for (let i = 1; i <= 3; i++) {
    const client = await prisma.client.create({
      data: {
        name: `Cliente Teste ${i}`,
        cpf: `${String(i).padStart(11, '0')}`,
        email: `cliente${i}@example.com`,
        phone: `(21) 9999${i}-000${i}`,
        address: `Rua Cliente ${i}, ${i * 100}`,
        companyId: company.id,
        active: true,
        birthDate: new Date(1980 + i, i - 1, i),
        maritalStatus: i === 1 ? 'Casado' : i === 2 ? 'Solteiro' : 'Divorciado',
        profession: i === 1 ? 'Engenheiro' : i === 2 ? 'Professor' : 'Médico',
      },
    });
    clients.push(client);
    console.log(`✅ Cliente ${i} criado: ${client.name}`);
  }
  console.log('');

  // 4. CRIAR PROCESSOS
  console.log('⚖️  Criando processos...');
  const cases = [];
  for (let i = 1; i <= 3; i++) {
    const processCase = await prisma.case.create({
      data: {
        processNumber: `000${i}00${i}-${i}${i}.2024.8.19.000${i}`,
        court: `TJRJ - ${i}ª Vara Cível`,
        subject: `Ação ${i === 1 ? 'de Indenização' : i === 2 ? 'Trabalhista' : 'de Divórcio'}`,
        value: i * 50000,
        status: i === 1 ? 'ACTIVE' : i === 2 ? 'ACTIVE' : 'FINISHED',
        companyId: company.id,
        clientId: clients[i - 1].id,
        notes: `Observações do processo ${i}`,
      },
    });
    cases.push(processCase);
    console.log(`✅ Processo ${i} criado: ${processCase.processNumber}`);
  }
  console.log('');

  // 5. CRIAR TRANSAÇÕES FINANCEIRAS
  console.log('💰 Criando transações financeiras...');
  const incomeTransaction = await prisma.financialTransaction.create({
    data: {
      type: 'INCOME',
      description: 'Honorários advocatícios - Cliente 1',
      amount: 15000.0,
      date: new Date('2024-11-01'),
      companyId: company.id,
      clientId: clients[0].id,
      caseId: cases[0].id,
    },
  });
  console.log(`✅ Receita criada: R$ ${incomeTransaction.amount}`);

  const expenseTransaction = await prisma.financialTransaction.create({
    data: {
      type: 'EXPENSE',
      description: 'Custas processuais',
      amount: 2500.0,
      date: new Date('2024-11-05'),
      companyId: company.id,
      clientId: clients[0].id,
      caseId: cases[0].id,
    },
  });
  console.log(`✅ Despesa criada: R$ ${expenseTransaction.amount}\n`);

  // 6. CRIAR DOCUMENTOS
  console.log('📄 Criando documentos...');
  const document1 = await prisma.document.create({
    data: {
      name: 'Contrato de Prestação de Serviços',
      description: 'Contrato assinado com o Cliente 1',
      storageType: 'link',
      externalUrl: 'https://drive.google.com/file/exemplo1',
      externalType: 'google_drive',
      companyId: company.id,
      clientId: clients[0].id,
      uploadedBy: adminUser.id,
    },
  });
  console.log(`✅ Documento 1 criado: ${document1.name}`);

  const document2 = await prisma.document.create({
    data: {
      name: 'Petição Inicial - Processo 1',
      description: 'Petição inicial do processo',
      storageType: 'link',
      externalUrl: 'https://drive.google.com/file/exemplo2',
      externalType: 'google_drive',
      companyId: company.id,
      caseId: cases[0].id,
      uploadedBy: adminUser.id,
    },
  });
  console.log(`✅ Documento 2 criado: ${document2.name}\n`);

  // 7. CRIAR EVENTOS DA AGENDA (TODOS OS TIPOS)
  console.log('📅 Criando eventos da agenda...');

  // Compromisso normal
  const compromisso = await prisma.scheduleEvent.create({
    data: {
      title: 'Reunião com Cliente 1',
      description: 'Discutir andamento do processo',
      type: 'COMPROMISSO',
      date: new Date('2024-11-20T10:00:00'),
      endDate: new Date('2024-11-20T11:00:00'),
      companyId: company.id,
      clientId: clients[0].id,
      caseId: cases[0].id,
      createdBy: adminUser.id,
      completed: false,
    },
  });
  console.log(`✅ Compromisso criado: ${compromisso.title}`);

  // Tarefa
  const tarefa = await prisma.scheduleEvent.create({
    data: {
      title: 'Elaborar petição inicial',
      description: 'Processo do Cliente 2',
      type: 'TAREFA',
      date: new Date('2024-11-18T14:00:00'),
      companyId: company.id,
      clientId: clients[1].id,
      caseId: cases[1].id,
      createdBy: adminUser.id,
      completed: false,
    },
  });
  console.log(`✅ Tarefa criada: ${tarefa.title}`);

  // Prazo
  const prazo = await prisma.scheduleEvent.create({
    data: {
      title: 'Prazo para contestação',
      description: 'Prazo de 15 dias corridos',
      type: 'PRAZO',
      date: new Date('2024-11-25T23:59:00'),
      companyId: company.id,
      clientId: clients[0].id,
      caseId: cases[0].id,
      createdBy: adminUser.id,
      completed: false,
    },
  });
  console.log(`✅ Prazo criado: ${prazo.title}`);

  // Audiência
  const audiencia = await prisma.scheduleEvent.create({
    data: {
      title: 'Audiência de Conciliação',
      description: 'Fórum Central - Sala 302',
      type: 'AUDIENCIA',
      date: new Date('2024-12-10T09:00:00'),
      endDate: new Date('2024-12-10T10:00:00'),
      companyId: company.id,
      clientId: clients[2].id,
      caseId: cases[2].id,
      createdBy: adminUser.id,
      completed: false,
    },
  });
  console.log(`✅ Audiência criada: ${audiencia.title}`);

  // 🎯 GOOGLE MEET
  const googleMeet = await prisma.scheduleEvent.create({
    data: {
      title: 'Reunião Google Meet - Estratégia Processual',
      description: 'Link: https://meet.google.com/abc-defg-hij\nDiscutir estratégia para recurso',
      type: 'GOOGLE_MEET',
      date: new Date('2024-11-22T15:00:00'),
      endDate: new Date('2024-11-22T16:00:00'),
      companyId: company.id,
      clientId: clients[0].id,
      caseId: cases[0].id,
      createdBy: adminUser.id,
      completed: false,
    },
  });
  console.log(`✅ 🎯 Google Meet criado: ${googleMeet.title}`);

  console.log('\n✅ ========================================');
  console.log('✅ TODOS OS DADOS DE TESTE FORAM CRIADOS!');
  console.log('✅ ========================================\n');

  console.log('📊 RESUMO:');
  console.log(`   Empresa: ${company.name}`);
  console.log(`   Usuários: 2 (admin@advwell.pro / usuario@advwell.pro)`);
  console.log(`   Senha: password123`);
  console.log(`   Clientes: ${clients.length}`);
  console.log(`   Processos: ${cases.length}`);
  console.log(`   Transações: 2 (1 receita + 1 despesa)`);
  console.log(`   Documentos: 1`);
  console.log(`   Eventos Agenda: 5 (Compromisso, Tarefa, Prazo, Audiência, Google Meet)`);
  console.log('');
  console.log('🔐 Login:');
  console.log('   Email: admin@advwell.pro');
  console.log('   Senha: password123');
  console.log('');
  console.log('🎯 Google Meet Event ID:', googleMeet.id);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
