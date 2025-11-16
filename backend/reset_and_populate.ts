import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

interface UserCredentials {
  email: string;
  password: string;
  role: string;
  name: string;
}

const credentials: UserCredentials[] = [];

async function main() {
  console.log('🗑️  Limpando banco de dados...\n');

  // Delete all data in order (respecting foreign key constraints)
  await prisma.caseMovement.deleteMany({});
  await prisma.caseDocument.deleteMany({});
  await prisma.casePart.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.financialTransaction.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('✅ Banco de dados limpo!\n');

  // ===== 1. CREATE SUPER_ADMIN =====
  console.log('👑 Criando SUPER_ADMIN...');
  const superAdminPassword = 'rbYSaYWVF1UDOSFsOipCZtN33mHVWA';
  const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'wasolutionscorp@gmail.com',
      password: hashedSuperAdminPassword,
      name: 'Super Administrator',
      role: UserRole.SUPER_ADMIN,
      active: true,
    },
  });

  credentials.push({
    email: superAdmin.email,
    password: superAdminPassword,
    role: 'SUPER_ADMIN',
    name: superAdmin.name,
  });

  console.log(`✅ SUPER_ADMIN criado: ${superAdmin.email}\n`);

  // ===== 2. CREATE COMPANY =====
  console.log('🏢 Criando empresa...');
  const company = await prisma.company.create({
    data: {
      name: 'Silva & Associados Advocacia',
      cnpj: '12.345.678/0001-90',
      email: 'contato@silvaassociados.adv.br',
      phone: '(11) 3456-7890',
      address: 'Av. Paulista, 1000 - Sala 1501',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      active: true,
    },
  });

  console.log(`✅ Empresa criada: ${company.name}\n`);

  // ===== 3. CREATE ADMIN =====
  console.log('👨‍💼 Criando ADMIN...');
  const adminPassword = generateSecurePassword();
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@silvaassociados.adv.br',
      password: hashedAdminPassword,
      name: 'Dr. João Silva',
      role: UserRole.ADMIN,
      companyId: company.id,
      active: true,
    },
  });

  credentials.push({
    email: admin.email,
    password: adminPassword,
    role: 'ADMIN',
    name: admin.name,
  });

  console.log(`✅ ADMIN criado: ${admin.name}\n`);

  // ===== 4. CREATE 4 USERS WITH DIFFERENT PERMISSIONS =====
  console.log('👥 Criando usuários com diferentes permissões...\n');

  // USER 1: View-only on clients and cases
  const user1Password = generateSecurePassword();
  const user1 = await prisma.user.create({
    data: {
      email: 'ana.santos@silvaassociados.adv.br',
      password: await bcrypt.hash(user1Password, 10),
      name: 'Ana Santos',
      role: UserRole.USER,
      companyId: company.id,
      active: true,
      permissions: {
        create: [
          { resource: 'clients', canView: true, canEdit: false, canDelete: false },
          { resource: 'cases', canView: true, canEdit: false, canDelete: false },
        ],
      },
    },
  });

  credentials.push({
    email: user1.email,
    password: user1Password,
    role: 'USER (View-only: Clientes, Processos)',
    name: user1.name,
  });

  console.log(`✅ Usuário 1: ${user1.name} - View-only em Clientes e Processos`);

  // USER 2: View+Edit on clients, View-only on financial
  const user2Password = generateSecurePassword();
  const user2 = await prisma.user.create({
    data: {
      email: 'carlos.oliveira@silvaassociados.adv.br',
      password: await bcrypt.hash(user2Password, 10),
      name: 'Carlos Oliveira',
      role: UserRole.USER,
      companyId: company.id,
      active: true,
      permissions: {
        create: [
          { resource: 'clients', canView: true, canEdit: true, canDelete: false },
          { resource: 'cases', canView: true, canEdit: true, canDelete: false },
          { resource: 'financial', canView: true, canEdit: false, canDelete: false },
        ],
      },
    },
  });

  credentials.push({
    email: user2.email,
    password: user2Password,
    role: 'USER (View+Edit: Clientes/Processos, View: Financeiro)',
    name: user2.name,
  });

  console.log(`✅ Usuário 2: ${user2.name} - View+Edit em Clientes/Processos, View em Financeiro`);

  // USER 3: Full permissions on clients/cases, View+Edit on financial
  const user3Password = generateSecurePassword();
  const user3 = await prisma.user.create({
    data: {
      email: 'mariana.costa@silvaassociados.adv.br',
      password: await bcrypt.hash(user3Password, 10),
      name: 'Mariana Costa',
      role: UserRole.USER,
      companyId: company.id,
      active: true,
      permissions: {
        create: [
          { resource: 'clients', canView: true, canEdit: true, canDelete: true },
          { resource: 'cases', canView: true, canEdit: true, canDelete: true },
          { resource: 'financial', canView: true, canEdit: true, canDelete: false },
        ],
      },
    },
  });

  credentials.push({
    email: user3.email,
    password: user3Password,
    role: 'USER (Full: Clientes/Processos, View+Edit: Financeiro)',
    name: user3.name,
  });

  console.log(`✅ Usuário 3: ${user3.name} - Full em Clientes/Processos, View+Edit em Financeiro`);

  // USER 4: Custom mix (View on cases, Full on financial)
  const user4Password = generateSecurePassword();
  const user4 = await prisma.user.create({
    data: {
      email: 'pedro.almeida@silvaassociados.adv.br',
      password: await bcrypt.hash(user4Password, 10),
      name: 'Pedro Almeida',
      role: UserRole.USER,
      companyId: company.id,
      active: true,
      permissions: {
        create: [
          { resource: 'cases', canView: true, canEdit: false, canDelete: false },
          { resource: 'financial', canView: true, canEdit: true, canDelete: true },
        ],
      },
    },
  });

  credentials.push({
    email: user4.email,
    password: user4Password,
    role: 'USER (View: Processos, Full: Financeiro)',
    name: user4.name,
  });

  console.log(`✅ Usuário 4: ${user4.name} - View em Processos, Full em Financeiro\n`);

  // ===== 5. CREATE CLIENTS =====
  console.log('📋 Criando clientes...');
  const clients = await prisma.client.createMany({
    data: [
      {
        companyId: company.id,
        name: 'Maria Aparecida da Silva',
        cpf: '123.456.789-00',
        email: 'maria.silva@email.com',
        phone: '(11) 98765-4321',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      },
      {
        companyId: company.id,
        name: 'José Carlos Santos',
        cpf: '234.567.890-11',
        email: 'jose.santos@email.com',
        phone: '(11) 97654-3210',
        address: 'Av. Brasil, 456',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '02345-678',
      },
      {
        companyId: company.id,
        name: 'Ana Paula Ferreira',
        cpf: '345.678.901-22',
        email: 'ana.ferreira@email.com',
        phone: '(11) 96543-2109',
        address: 'Rua São João, 789',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '03456-789',
      },
      {
        companyId: company.id,
        name: 'Ricardo Oliveira Lima',
        cpf: '456.789.012-33',
        email: 'ricardo.lima@email.com',
        phone: '(11) 95432-1098',
        address: 'Av. Paulista, 1500',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-200',
      },
      {
        companyId: company.id,
        name: 'Fernanda Costa Almeida',
        cpf: '567.890.123-44',
        email: 'fernanda.almeida@email.com',
        phone: '(11) 94321-0987',
        address: 'Rua Augusta, 2000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01304-001',
      },
      {
        companyId: company.id,
        name: 'TechSolutions Ltda',
        cpf: '12.345.678/0001-99',
        email: 'contato@techsolutions.com',
        phone: '(11) 3333-4444',
        address: 'Av. Faria Lima, 3000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01452-000',
      },
      {
        companyId: company.id,
        name: 'Construtora Boa Vista SA',
        cpf: '23.456.789/0001-88',
        email: 'juridico@boavista.com',
        phone: '(11) 2222-3333',
        address: 'Rua Vergueiro, 5000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '04101-000',
      },
      {
        companyId: company.id,
        name: 'Marcelo Souza Pereira',
        cpf: '678.901.234-55',
        email: 'marcelo.pereira@email.com',
        phone: '(11) 93210-9876',
        address: 'Rua da Consolação, 800',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01302-000',
      },
      {
        companyId: company.id,
        name: 'Patricia Rodrigues Martins',
        cpf: '789.012.345-66',
        email: 'patricia.martins@email.com',
        phone: '(11) 92109-8765',
        address: 'Av. Rebouças, 1200',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '05401-100',
      },
      {
        companyId: company.id,
        name: 'Comércio Global Importadora',
        cpf: '34.567.890/0001-77',
        email: 'comercial@comercioglobal.com',
        phone: '(11) 4444-5555',
        address: 'Rua Oscar Freire, 600',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01426-000',
      },
      {
        companyId: company.id,
        name: 'Roberto Alves da Costa',
        cpf: '890.123.456-77',
        email: 'roberto.costa@email.com',
        phone: '(11) 91098-7654',
        address: 'Av. Ibirapuera, 3000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '04029-200',
      },
      {
        companyId: company.id,
        name: 'Juliana Mendes Silva',
        cpf: '901.234.567-88',
        email: 'juliana.silva@email.com',
        phone: '(11) 90987-6543',
        address: 'Rua Haddock Lobo, 1500',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01414-002',
      },
    ],
  });

  console.log(`✅ ${clients.count} clientes criados\n`);

  // Fetch created clients for case creation
  const allClients = await prisma.client.findMany({
    where: { companyId: company.id },
  });

  // ===== 6. CREATE CASES =====
  console.log('⚖️  Criando processos...');

  const casesData = [
    {
      clientId: allClients[0].id,
      processNumber: '1000123-45.2024.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TJSP - 1ª Vara Cível',
      subject: 'Ação de Cobrança',
      value: 50000.00,
      notes: 'Ação de cobrança de valores não pagos referente a contrato de prestação de serviços.',
    },
    {
      clientId: allClients[1].id,
      processNumber: '2000234-56.2024.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TRT 2ª Região - 5ª Vara do Trabalho',
      subject: 'Reclamação Trabalhista',
      value: 75000.00,
      notes: 'Reclamação trabalhista com pedido de horas extras e equiparação salarial.',
    },
    {
      clientId: allClients[2].id,
      processNumber: '3000345-67.2023.8.26.0100',
      status: 'FINISHED' as const,
      court: 'TJSP - 2ª Vara de Família',
      subject: 'Divórcio Consensual',
      value: 0,
      notes: 'Processo de divórcio consensual com partilha de bens. Concluído em 15/01/2024.',
    },
    {
      clientId: allClients[3].id,
      processNumber: '4000456-78.2024.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TJSP - 10ª Vara Criminal',
      subject: 'Defesa Criminal - Estelionato',
      value: 0,
      notes: 'Defesa criminal em processo por suposto crime de estelionato.',
    },
    {
      clientId: allClients[4].id,
      processNumber: '5000567-89.2024.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TJSP - 3ª Vara Cível',
      subject: 'Indenização por Danos Morais',
      value: 30000.00,
      notes: 'Ação indenizatória por danos morais decorrentes de negativação indevida.',
    },
    {
      clientId: allClients[5].id,
      processNumber: '6000678-90.2023.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TJSP - 1ª Vara Empresarial',
      subject: 'Dissolução de Sociedade',
      value: 500000.00,
      notes: 'Ação de dissolução parcial de sociedade empresarial com apuração de haveres.',
    },
    {
      clientId: allClients[6].id,
      processNumber: '7000789-01.2024.8.26.0100',
      status: 'ARCHIVED' as const,
      court: 'TJSP - 4ª Vara Cível',
      subject: 'Cobrança de Aluguel',
      value: 15000.00,
      notes: 'Ação de cobrança de aluguéis atrasados. Acordo firmado entre as partes em 10/05/2024.',
    },
    {
      clientId: allClients[7].id,
      processNumber: '8000890-12.2024.8.26.0100',
      status: 'ACTIVE' as const,
      court: 'TJSP - Juizado Especial Cível',
      subject: 'Defeito em Produto',
      value: 8000.00,
      notes: 'Ação consumerista por vício de produto com pedido de devolução de valores.',
    },
  ];

  const createdCases = [];
  for (const caseData of casesData) {
    const newCase = await prisma.case.create({
      data: {
        ...caseData,
        companyId: company.id,
      },
    });
    createdCases.push(newCase);
  }

  console.log(`✅ ${createdCases.length} processos criados\n`);

  // ===== 7. CREATE CASE PARTS =====
  console.log('👥 Criando partes dos processos...');

  const casePartsData = [
    // Case 1 - Ação de Cobrança
    { caseId: createdCases[0].id, type: 'AUTOR' as const, name: 'Maria Aparecida da Silva', cpfCnpj: '123.456.789-00' },
    { caseId: createdCases[0].id, type: 'REU' as const, name: 'Empresa XYZ Ltda', cpfCnpj: '11.222.333/0001-44' },

    // Case 2 - Trabalhista
    { caseId: createdCases[1].id, type: 'AUTOR' as const, name: 'José Carlos Santos', cpfCnpj: '234.567.890-11' },
    { caseId: createdCases[1].id, type: 'REU' as const, name: 'Indústria ABC SA', cpfCnpj: '22.333.444/0001-55' },

    // Case 3 - Divórcio
    { caseId: createdCases[2].id, type: 'AUTOR' as const, name: 'Ana Paula Ferreira', cpfCnpj: '345.678.901-22' },
    { caseId: createdCases[2].id, type: 'REU' as const, name: 'Paulo Roberto Ferreira', cpfCnpj: '111.222.333-44' },

    // Case 4 - Criminal
    { caseId: createdCases[3].id, type: 'REU' as const, name: 'Ricardo Oliveira Lima', cpfCnpj: '456.789.012-33' },
    { caseId: createdCases[3].id, type: 'AUTOR' as const, name: 'Ministério Público', cpfCnpj: '' },

    // Case 5 - Danos Morais
    { caseId: createdCases[4].id, type: 'AUTOR' as const, name: 'Fernanda Costa Almeida', cpfCnpj: '567.890.123-44' },
    { caseId: createdCases[4].id, type: 'REU' as const, name: 'Banco Nacional SA', cpfCnpj: '44.555.666/0001-77' },

    // Case 6 - Dissolução
    { caseId: createdCases[5].id, type: 'AUTOR' as const, name: 'TechSolutions Ltda', cpfCnpj: '12.345.678/0001-99' },
    { caseId: createdCases[5].id, type: 'REU' as const, name: 'Innovation Partners Ltda', cpfCnpj: '55.666.777/0001-88' },

    // Case 7 - Cobrança Aluguel
    { caseId: createdCases[6].id, type: 'AUTOR' as const, name: 'Construtora Boa Vista SA', cpfCnpj: '23.456.789/0001-88' },
    { caseId: createdCases[6].id, type: 'REU' as const, name: 'Locatários Associados Ltda', cpfCnpj: '66.777.888/0001-99' },

    // Case 8 - Consumidor
    { caseId: createdCases[7].id, type: 'AUTOR' as const, name: 'Marcelo Souza Pereira', cpfCnpj: '678.901.234-55' },
    { caseId: createdCases[7].id, type: 'REU' as const, name: 'Eletrônicos Store Ltda', cpfCnpj: '77.888.999/0001-00' },
  ];

  const caseParts = await prisma.casePart.createMany({
    data: casePartsData,
  });

  console.log(`✅ ${caseParts.count} partes criadas\n`);

  // ===== 8. CREATE CASE MOVEMENTS =====
  console.log('📝 Criando movimentações processuais...');

  const movements = [
    // Movements for Case 1
    { caseId: createdCases[0].id, movementCode: 11, movementName: 'Distribuição', movementDate: new Date('2024-01-15'), description: 'Distribuição da Petição Inicial' },
    { caseId: createdCases[0].id, movementCode: 22, movementName: 'Citação', movementDate: new Date('2024-01-20'), description: 'Citação do Réu' },
    { caseId: createdCases[0].id, movementCode: 60, movementName: 'Contestação', movementDate: new Date('2024-02-05'), description: 'Apresentação de Contestação' },
    { caseId: createdCases[0].id, movementCode: 63, movementName: 'Réplica', movementDate: new Date('2024-02-20'), description: 'Réplica apresentada' },

    // Movements for Case 2
    { caseId: createdCases[1].id, movementCode: 11, movementName: 'Distribuição', movementDate: new Date('2024-02-20'), description: 'Reclamação Trabalhista Distribuída' },
    { caseId: createdCases[1].id, movementCode: 60, movementName: 'Defesa', movementDate: new Date('2024-02-25'), description: 'Defesa Apresentada' },
    { caseId: createdCases[1].id, movementCode: 193, movementName: 'Audiência Designada', movementDate: new Date('2024-03-10'), description: 'Audiência Inicial Designada para 15/04/2024' },

    // Movements for Case 3
    { caseId: createdCases[2].id, movementCode: 11, movementName: 'Distribuição', movementDate: new Date('2023-06-10'), description: 'Petição Inicial de Divórcio' },
    { caseId: createdCases[2].id, movementCode: 50, movementName: 'Manifestação', movementDate: new Date('2023-06-20'), description: 'Manifestação da Parte Requerida' },
    { caseId: createdCases[2].id, movementCode: 123, movementName: 'Homologação', movementDate: new Date('2023-07-15'), description: 'Homologação do Acordo' },
    { caseId: createdCases[2].id, movementCode: 51, movementName: 'Sentença', movementDate: new Date('2024-01-15'), description: 'Sentença - Divórcio Homologado' },

    // Movements for Case 4
    { caseId: createdCases[3].id, movementCode: 999, movementName: 'Recebimento', movementDate: new Date('2024-03-05'), description: 'Denúncia Recebida' },
    { caseId: createdCases[3].id, movementCode: 60, movementName: 'Resposta', movementDate: new Date('2024-03-15'), description: 'Resposta à Acusação Apresentada' },
    { caseId: createdCases[3].id, movementCode: 193, movementName: 'Audiência Designada', movementDate: new Date('2024-04-01'), description: 'Audiência de Instrução Designada' },

    // Movements for Case 5
    { caseId: createdCases[4].id, movementCode: 11, movementName: 'Distribuição', movementDate: new Date('2024-04-10'), description: 'Distribuição da Ação Indenizatória' },
    { caseId: createdCases[4].id, movementCode: 22, movementName: 'Citação', movementDate: new Date('2024-04-25'), description: 'Citação do Réu Cumprida' },
    { caseId: createdCases[4].id, movementCode: 60, movementName: 'Contestação', movementDate: new Date('2024-05-10'), description: 'Contestação Apresentada' },
  ];

  const caseMovements = await prisma.caseMovement.createMany({
    data: movements,
  });

  console.log(`✅ ${caseMovements.count} movimentações criadas\n`);

  // ===== 9. CREATE FINANCIAL TRANSACTIONS =====
  console.log('💰 Criando transações financeiras...');

  const transactions = [
    {
      companyId: company.id,
      clientId: allClients[0].id,
      caseId: createdCases[0].id,
      type: 'INCOME' as const,
      description: 'Honorários - Ação de Cobrança',
      amount: 5000.00,
      date: new Date('2024-01-20'),
    },
    {
      companyId: company.id,
      clientId: allClients[1].id,
      caseId: createdCases[1].id,
      type: 'INCOME' as const,
      description: 'Honorários - Reclamação Trabalhista',
      amount: 7500.00,
      date: new Date('2024-02-25'),
    },
    {
      companyId: company.id,
      clientId: allClients[2].id,
      caseId: createdCases[2].id,
      type: 'INCOME' as const,
      description: 'Honorários - Divórcio Consensual',
      amount: 3000.00,
      date: new Date('2023-07-20'),
    },
    {
      companyId: company.id,
      clientId: allClients[0].id,
      type: 'EXPENSE' as const,
      description: 'Custas Processuais - Processo 1000123-45.2024',
      amount: 450.00,
      date: new Date('2024-01-15'),
    },
    {
      companyId: company.id,
      clientId: allClients[1].id,
      type: 'EXPENSE' as const,
      description: 'Custas Processuais - Processo 2000234-56.2024',
      amount: 380.00,
      date: new Date('2024-02-20'),
    },
    {
      companyId: company.id,
      clientId: allClients[3].id,
      caseId: createdCases[3].id,
      type: 'INCOME' as const,
      description: 'Honorários Iniciais - Defesa Criminal',
      amount: 10000.00,
      date: new Date('2024-03-10'),
    },
    {
      companyId: company.id,
      clientId: allClients[4].id,
      caseId: createdCases[4].id,
      type: 'INCOME' as const,
      description: 'Honorários - Ação Indenizatória',
      amount: 4500.00,
      date: new Date('2024-04-15'),
    },
    {
      companyId: company.id,
      clientId: allClients[0].id,
      type: 'EXPENSE' as const,
      description: 'Renovação de Assinatura Software Jurídico',
      amount: 1200.00,
      date: new Date('2024-01-05'),
    },
    {
      companyId: company.id,
      clientId: allClients[0].id,
      type: 'EXPENSE' as const,
      description: 'Material de Escritório',
      amount: 350.00,
      date: new Date('2024-02-10'),
    },
    {
      companyId: company.id,
      clientId: allClients[5].id,
      caseId: createdCases[5].id,
      type: 'INCOME' as const,
      description: 'Honorários - Dissolução de Sociedade (1ª Parcela)',
      amount: 25000.00,
      date: new Date('2023-09-01'),
    },
    {
      companyId: company.id,
      clientId: allClients[5].id,
      caseId: createdCases[5].id,
      type: 'INCOME' as const,
      description: 'Honorários - Dissolução de Sociedade (2ª Parcela)',
      amount: 25000.00,
      date: new Date('2024-01-15'),
    },
    {
      companyId: company.id,
      clientId: allClients[5].id,
      type: 'EXPENSE' as const,
      description: 'Perícia Contábil - Dissolução de Sociedade',
      amount: 5000.00,
      date: new Date('2023-10-20'),
    },
    {
      companyId: company.id,
      clientId: allClients[6].id,
      caseId: createdCases[6].id,
      type: 'INCOME' as const,
      description: 'Honorários - Cobrança de Aluguel',
      amount: 2000.00,
      date: new Date('2023-11-20'),
    },
    {
      companyId: company.id,
      clientId: allClients[7].id,
      caseId: createdCases[7].id,
      type: 'INCOME' as const,
      description: 'Honorários - Ação Consumerista',
      amount: 1500.00,
      date: new Date('2024-05-25'),
    },
    {
      companyId: company.id,
      clientId: allClients[0].id,
      type: 'EXPENSE' as const,
      description: 'Manutenção do Sistema',
      amount: 800.00,
      date: new Date('2024-03-15'),
    },
  ];

  const financialTransactions = await prisma.financialTransaction.createMany({
    data: transactions,
  });

  console.log(`✅ ${financialTransactions.count} transações financeiras criadas\n`);

  // ===== 10. SAVE CREDENTIALS TO SECURE FILE =====
  const credentialsOutput = `
╔════════════════════════════════════════════════════════════════╗
║                  CREDENCIAIS DO SISTEMA                        ║
║                   - USO INTERNO -                              ║
╚════════════════════════════════════════════════════════════════╝

📅 Data de Criação: ${new Date().toLocaleString('pt-BR')}

════════════════════════════════════════════════════════════════

👑 SUPER ADMINISTRADOR
   Nome: ${credentials[0].name}
   Email: ${credentials[0].email}
   Senha: ${credentials[0].password}
   Acesso: Gerenciamento de todas as empresas

════════════════════════════════════════════════════════════════

🏢 EMPRESA: ${company.name}
   CNPJ: ${company.cnpj}
   Email: ${company.email}

────────────────────────────────────────────────────────────────

👨‍💼 ADMINISTRADOR DA EMPRESA
   Nome: ${credentials[1].name}
   Email: ${credentials[1].email}
   Senha: ${credentials[1].password}
   Acesso: Gerenciamento de usuários da empresa

────────────────────────────────────────────────────────────────

👥 USUÁRIOS DA EMPRESA

📌 USUÁRIO 1 - VIEW-ONLY
   Nome: ${credentials[2].name}
   Email: ${credentials[2].email}
   Senha: ${credentials[2].password}
   Permissões:
   • Clientes: Ver apenas
   • Processos: Ver apenas

────────────────────────────────────────────────────────────────

📌 USUÁRIO 2 - EDITOR LIMITADO
   Nome: ${credentials[3].name}
   Email: ${credentials[3].email}
   Senha: ${credentials[3].password}
   Permissões:
   • Clientes: Ver e Editar
   • Processos: Ver e Editar
   • Financeiro: Ver apenas

────────────────────────────────────────────────────────────────

📌 USUÁRIO 3 - PERMISSÕES COMPLETAS
   Nome: ${credentials[4].name}
   Email: ${credentials[4].email}
   Senha: ${credentials[4].password}
   Permissões:
   • Clientes: Ver, Editar e Excluir
   • Processos: Ver, Editar e Excluir
   • Financeiro: Ver e Editar

────────────────────────────────────────────────────────────────

📌 USUÁRIO 4 - PERFIL FINANCEIRO
   Nome: ${credentials[5].name}
   Email: ${credentials[5].email}
   Senha: ${credentials[5].password}
   Permissões:
   • Processos: Ver apenas
   • Financeiro: Ver, Editar e Excluir

════════════════════════════════════════════════════════════════

📊 RESUMO DOS DADOS CRIADOS:

   ✓ ${clients.count} Clientes
   ✓ ${createdCases.length} Processos
   ✓ ${caseParts.count} Partes dos Processos
   ✓ ${caseMovements.count} Movimentações Processuais
   ✓ ${financialTransactions.count} Transações Financeiras

════════════════════════════════════════════════════════════════

⚠️  IMPORTANTE: Este arquivo contém informações sensíveis.
   Mantenha-o em local seguro e não compartilhe publicamente.

════════════════════════════════════════════════════════════════
`;

  writeFileSync('/tmp/CREDENTIALS.txt', credentialsOutput);
  console.log('🔐 Credenciais salvas em: /tmp/CREDENTIALS.txt\n');

  // ===== FINAL SUMMARY =====
  console.log('═'.repeat(70));
  console.log('\n✨ BANCO DE DADOS RESETADO E POPULADO COM SUCESSO! ✨\n');
  console.log('═'.repeat(70));
  console.log('\n📊 RESUMO:\n');
  console.log(`   👑 1 SUPER_ADMIN criado`);
  console.log(`   🏢 1 Empresa criada: ${company.name}`);
  console.log(`   👨‍💼 1 ADMIN criado`);
  console.log(`   👥 4 USUÁRIOS criados com diferentes permissões`);
  console.log(`   📋 ${clients.count} Clientes`);
  console.log(`   ⚖️  ${createdCases.length} Processos`);
  console.log(`   👥 ${caseParts.count} Partes dos Processos`);
  console.log(`   📝 ${caseMovements.count} Movimentações`);
  console.log(`   💰 ${financialTransactions.count} Transações Financeiras`);
  console.log('\n═'.repeat(70));
  console.log('\n🔐 Credenciais salvas em: /root/advtom/CREDENTIALS.txt');
  console.log('⚠️  NÃO compartilhe este arquivo publicamente!\n');
  console.log('═'.repeat(70));
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
