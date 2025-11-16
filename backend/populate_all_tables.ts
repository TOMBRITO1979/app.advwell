import { PrismaClient, UserRole, CaseStatus, CasePartType, TransactionType } from '@prisma/client';
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

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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
  await prisma.systemConfig.deleteMany({});

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

  // ===== 2. CREATE COMPANIES (5 companies) =====
  console.log('🏢 Criando 5 empresas...');
  const companies = [];

  const companiesData = [
    {
      name: 'Advocacia Silva & Oliveira',
      cnpj: '12.345.678/0001-90',
      email: 'contato@silvaeoliveira.adv.br',
      phone: '(11) 3456-7890',
      address: 'Av. Paulista, 1000 - Sala 1501',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      active: true,
    },
    {
      name: 'Costa & Associados Advocacia',
      cnpj: '23.456.789/0001-01',
      email: 'juridico@costaassociados.adv.br',
      phone: '(21) 2345-6789',
      address: 'Rua do Ouvidor, 250',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20040-030',
      active: true,
    },
    {
      name: 'Mendes & Pereira Advogados',
      cnpj: '34.567.890/0001-12',
      email: 'contato@mendespereira.com.br',
      phone: '(31) 3234-5678',
      address: 'Av. Afonso Pena, 500',
      city: 'Belo Horizonte',
      state: 'MG',
      zipCode: '30130-001',
      active: true,
    },
    {
      name: 'Almeida Escritório Jurídico',
      cnpj: '45.678.901/0001-23',
      email: 'contato@almeidajuridico.com.br',
      phone: '(41) 3123-4567',
      address: 'Rua XV de Novembro, 800',
      city: 'Curitiba',
      state: 'PR',
      zipCode: '80020-310',
      active: true,
    },
    {
      name: 'Advocacia Rodrigues Ltda',
      cnpj: '56.789.012/0001-34',
      email: 'juridico@rodriguesadv.com',
      phone: '(51) 3012-3456',
      address: 'Av. Borges de Medeiros, 300',
      city: 'Porto Alegre',
      state: 'RS',
      zipCode: '90020-020',
      active: true,
    },
  ];

  for (const companyData of companiesData) {
    const company = await prisma.company.create({ data: companyData });
    companies.push(company);
  }

  console.log(`✅ ${companies.length} empresas criadas\n`);

  // ===== 3. CREATE ADMINS AND USERS FOR EACH COMPANY (5 users per company) =====
  console.log('👥 Criando usuários para cada empresa (5 por empresa)...\n');

  const allUsers = [];

  for (const company of companies) {
    // Create ADMIN
    const adminPassword = generateSecurePassword();
    const admin = await prisma.user.create({
      data: {
        email: `admin@${company.email.split('@')[1]}`,
        password: await bcrypt.hash(adminPassword, 10),
        name: `Administrador - ${company.name.split(' ')[0]}`,
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

    allUsers.push(admin);

    // Create 4 regular users
    const userNames = [
      'Ana Silva Santos',
      'Carlos Eduardo Oliveira',
      'Mariana Costa Ferreira',
      'Pedro Henrique Almeida'
    ];

    for (let i = 0; i < 4; i++) {
      const userPassword = generateSecurePassword();
      const user = await prisma.user.create({
        data: {
          email: `user${i + 1}@${company.email.split('@')[1]}`,
          password: await bcrypt.hash(userPassword, 10),
          name: userNames[i],
          role: UserRole.USER,
          companyId: company.id,
          active: true,
          permissions: {
            create: i === 0 ? [
              { resource: 'clients', canView: true, canEdit: false, canDelete: false },
              { resource: 'cases', canView: true, canEdit: false, canDelete: false },
            ] : i === 1 ? [
              { resource: 'clients', canView: true, canEdit: true, canDelete: false },
              { resource: 'cases', canView: true, canEdit: true, canDelete: false },
              { resource: 'financial', canView: true, canEdit: false, canDelete: false },
            ] : i === 2 ? [
              { resource: 'clients', canView: true, canEdit: true, canDelete: true },
              { resource: 'cases', canView: true, canEdit: true, canDelete: true },
              { resource: 'financial', canView: true, canEdit: true, canDelete: false },
            ] : [
              { resource: 'cases', canView: true, canEdit: false, canDelete: false },
              { resource: 'financial', canView: true, canEdit: true, canDelete: true },
            ],
          },
        },
      });

      credentials.push({
        email: user.email,
        password: userPassword,
        role: `USER (Company: ${company.name.substring(0, 20)})`,
        name: user.name,
      });

      allUsers.push(user);
    }
  }

  console.log(`✅ ${allUsers.length} usuários criados (${companies.length} ADMIN + ${companies.length * 4} USERS)\n`);

  // ===== 4. CREATE CLIENTS (15 per company) =====
  console.log('📋 Criando clientes (15 por empresa)...');

  const allClients = [];

  const clientsBase = [
    { name: 'Maria Aparecida da Silva', cpf: '123.456.789-00', email: 'maria.silva@email.com', phone: '(11) 98765-4321' },
    { name: 'José Carlos Santos', cpf: '234.567.890-11', email: 'jose.santos@email.com', phone: '(11) 97654-3210' },
    { name: 'Ana Paula Ferreira', cpf: '345.678.901-22', email: 'ana.ferreira@email.com', phone: '(11) 96543-2109' },
    { name: 'Ricardo Oliveira Lima', cpf: '456.789.012-33', email: 'ricardo.lima@email.com', phone: '(11) 95432-1098' },
    { name: 'Fernanda Costa Almeida', cpf: '567.890.123-44', email: 'fernanda.almeida@email.com', phone: '(11) 94321-0987' },
    { name: 'TechSolutions Ltda', cpf: '12.345.678/0001-99', email: 'contato@techsolutions.com', phone: '(11) 3333-4444' },
    { name: 'Construtora Boa Vista SA', cpf: '23.456.789/0001-88', email: 'juridico@boavista.com', phone: '(11) 2222-3333' },
    { name: 'Marcelo Souza Pereira', cpf: '678.901.234-55', email: 'marcelo.pereira@email.com', phone: '(11) 93210-9876' },
    { name: 'Patricia Rodrigues Martins', cpf: '789.012.345-66', email: 'patricia.martins@email.com', phone: '(11) 92109-8765' },
    { name: 'Comércio Global Importadora', cpf: '34.567.890/0001-77', email: 'comercial@comercioglobal.com', phone: '(11) 4444-5555' },
    { name: 'Roberto Alves da Costa', cpf: '890.123.456-77', email: 'roberto.costa@email.com', phone: '(11) 91098-7654' },
    { name: 'Juliana Mendes Silva', cpf: '901.234.567-88', email: 'juliana.silva@email.com', phone: '(11) 90987-6543' },
    { name: 'Eduardo Fernandes Ribeiro', cpf: '012.345.678-99', email: 'eduardo.ribeiro@email.com', phone: '(11) 89876-5432' },
    { name: 'Gabriela Santos Araújo', cpf: '123.456.780-00', email: 'gabriela.araujo@email.com', phone: '(11) 88765-4321' },
    { name: 'Tech Innovations Inc', cpf: '45.678.901/0001-66', email: 'contato@techinnovations.com', phone: '(11) 5555-6666' },
  ];

  for (const company of companies) {
    for (const clientBase of clientsBase) {
      const client = await prisma.client.create({
        data: {
          ...clientBase,
          companyId: company.id,
          address: 'Rua das Flores, 123',
          city: company.city,
          state: company.state,
          zipCode: '01234-567',
          active: true,
        },
      });
      allClients.push(client);
    }
  }

  console.log(`✅ ${allClients.length} clientes criados\n`);

  // ===== 5. CREATE CASES (10 per company) =====
  console.log('⚖️  Criando processos (10 por empresa)...');

  const allCases = [];

  const casesBase = [
    { processNumber: '1000123-45.2024.8.26.0100', court: 'TJSP - 1ª Vara Cível', subject: 'Ação de Cobrança', value: 50000.00, status: CaseStatus.ACTIVE },
    { processNumber: '2000234-56.2024.8.26.0100', court: 'TRT 2ª Região - 5ª Vara do Trabalho', subject: 'Reclamação Trabalhista', value: 75000.00, status: CaseStatus.ACTIVE },
    { processNumber: '3000345-67.2023.8.26.0100', court: 'TJSP - 2ª Vara de Família', subject: 'Divórcio Consensual', value: 0, status: CaseStatus.FINISHED },
    { processNumber: '4000456-78.2024.8.26.0100', court: 'TJSP - 10ª Vara Criminal', subject: 'Defesa Criminal', value: 0, status: CaseStatus.ACTIVE },
    { processNumber: '5000567-89.2024.8.26.0100', court: 'TJSP - 3ª Vara Cível', subject: 'Indenização por Danos Morais', value: 30000.00, status: CaseStatus.ACTIVE },
    { processNumber: '6000678-90.2023.8.26.0100', court: 'TJSP - 1ª Vara Empresarial', subject: 'Dissolução de Sociedade', value: 500000.00, status: CaseStatus.ACTIVE },
    { processNumber: '7000789-01.2024.8.26.0100', court: 'TJSP - 4ª Vara Cível', subject: 'Cobrança de Aluguel', value: 15000.00, status: CaseStatus.ARCHIVED },
    { processNumber: '8000890-12.2024.8.26.0100', court: 'TJSP - Juizado Especial Cível', subject: 'Defeito em Produto', value: 8000.00, status: CaseStatus.ACTIVE },
    { processNumber: '9000901-23.2024.8.26.0100', court: 'TJSP - 5ª Vara Cível', subject: 'Ação Possessória', value: 120000.00, status: CaseStatus.ACTIVE },
    { processNumber: '1001012-34.2024.8.26.0100', court: 'TJSP - 6ª Vara Cível', subject: 'Revisão de Contrato', value: 45000.00, status: CaseStatus.ACTIVE },
  ];

  let caseIndex = 0;
  for (let companyIdx = 0; companyIdx < companies.length; companyIdx++) {
    const company = companies[companyIdx];
    const companyClients = allClients.filter(c => c.companyId === company.id);

    for (let i = 0; i < 10; i++) {
      const caseBase = casesBase[i];
      // Create truly unique process number using company index and case index
      const baseNumber = 1000000 + (companyIdx * 100) + i;
      const uniqueProcessNumber = `${baseNumber}-45.2024.8.26.0100`;

      const caseRecord = await prisma.case.create({
        data: {
          processNumber: uniqueProcessNumber,
          court: caseBase.court,
          subject: caseBase.subject,
          value: caseBase.value,
          status: caseBase.status,
          companyId: company.id,
          clientId: companyClients[i % companyClients.length].id,
          notes: `Processo de ${caseBase.subject} em andamento.`,
        },
      });
      allCases.push(caseRecord);
      caseIndex++;
    }
  }

  console.log(`✅ ${allCases.length} processos criados\n`);

  // ===== 6. CREATE CASE PARTS (2-3 per case) =====
  console.log('👥 Criando partes dos processos...');

  let totalParts = 0;
  for (const caseRecord of allCases) {
    // Author
    await prisma.casePart.create({
      data: {
        caseId: caseRecord.id,
        type: CasePartType.AUTOR,
        name: 'Autor do Processo',
        cpfCnpj: '123.456.789-00',
        phone: '(11) 91234-5678',
        address: 'Rua das Flores, 123',
      },
    });
    totalParts++;

    // Defendant
    await prisma.casePart.create({
      data: {
        caseId: caseRecord.id,
        type: CasePartType.REU,
        name: 'Réu do Processo',
        cpfCnpj: '987.654.321-00',
        phone: '(11) 98765-4321',
        address: 'Av. Paulista, 456',
      },
    });
    totalParts++;

    // Legal Representative (for some cases)
    if (Math.random() > 0.5) {
      await prisma.casePart.create({
        data: {
          caseId: caseRecord.id,
          type: CasePartType.REPRESENTANTE_LEGAL,
          name: 'Representante Legal',
          cpfCnpj: '111.222.333-44',
          phone: '(11) 99999-8888',
          address: 'Rua do Advogado, 789',
        },
      });
      totalParts++;
    }
  }

  console.log(`✅ ${totalParts} partes criadas\n`);

  // ===== 7. CREATE CASE MOVEMENTS (5 per case) =====
  console.log('📝 Criando movimentações processuais (5 por processo)...');

  let totalMovements = 0;
  for (const caseRecord of allCases) {
    const movements = [
      { movementCode: 11, movementName: 'Distribuição', description: 'Distribuição da Petição Inicial', date: new Date('2024-01-15') },
      { movementCode: 22, movementName: 'Citação', description: 'Citação do Réu', date: new Date('2024-01-20') },
      { movementCode: 60, movementName: 'Contestação', description: 'Apresentação de Contestação', date: new Date('2024-02-05') },
      { movementCode: 63, movementName: 'Réplica', description: 'Réplica apresentada', date: new Date('2024-02-20') },
      { movementCode: 193, movementName: 'Audiência Designada', description: 'Audiência de Conciliação designada', date: new Date('2024-03-15') },
    ];

    for (const movement of movements) {
      await prisma.caseMovement.create({
        data: {
          caseId: caseRecord.id,
          movementCode: movement.movementCode,
          movementName: movement.movementName,
          movementDate: movement.date,
          description: movement.description,
        },
      });
      totalMovements++;
    }
  }

  console.log(`✅ ${totalMovements} movimentações criadas\n`);

  // ===== 8. CREATE FINANCIAL TRANSACTIONS (10 per company) =====
  console.log('💰 Criando transações financeiras (10 por empresa)...');

  let totalTransactions = 0;
  for (const company of companies) {
    const companyClients = allClients.filter(c => c.companyId === company.id);
    const companyCases = allCases.filter(c => c.companyId === company.id);

    // 7 income transactions
    for (let i = 0; i < 7; i++) {
      await prisma.financialTransaction.create({
        data: {
          companyId: company.id,
          clientId: companyClients[i % companyClients.length].id,
          caseId: companyCases[i % companyCases.length].id,
          type: TransactionType.INCOME,
          description: `Honorários - ${companyCases[i % companyCases.length].subject}`,
          amount: 5000 + (i * 1000),
          date: new Date(2024, i, 15),
        },
      });
      totalTransactions++;
    }

    // 3 expense transactions
    for (let i = 0; i < 3; i++) {
      await prisma.financialTransaction.create({
        data: {
          companyId: company.id,
          clientId: companyClients[i % companyClients.length].id,
          type: TransactionType.EXPENSE,
          description: `Despesa - ${['Custas Processuais', 'Material de Escritório', 'Software Jurídico'][i]}`,
          amount: 500 + (i * 300),
          date: new Date(2024, i + 1, 10),
        },
      });
      totalTransactions++;
    }
  }

  console.log(`✅ ${totalTransactions} transações criadas\n`);

  // ===== 9. CREATE SYSTEM CONFIG (5 entries) =====
  console.log('⚙️  Criando configurações do sistema...');

  const configEntries = [
    { key: 'smtp_enabled', value: 'true' },
    { key: 'datajud_sync_enabled', value: 'true' },
    { key: 'max_upload_size_mb', value: '50' },
    { key: 'session_timeout_minutes', value: '120' },
    { key: 'system_version', value: '1.0.0' },
  ];

  for (const config of configEntries) {
    await prisma.systemConfig.create({
      data: config,
    });
  }

  console.log(`✅ ${configEntries.length} configurações criadas\n`);

  // ===== 10. SAVE CREDENTIALS =====
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

════════════════════════════════════════════════════════════════

📋 TODAS AS CREDENCIAIS:

${credentials.map((cred, i) => `
${i + 1}. ${cred.name}
   Email: ${cred.email}
   Senha: ${cred.password}
   Role: ${cred.role}
`).join('\n')}

════════════════════════════════════════════════════════════════

⚠️  IMPORTANTE: Este arquivo contém informações sensíveis.
   Mantenha-o em local seguro e não compartilhe publicamente.

════════════════════════════════════════════════════════════════
`;

  writeFileSync('/tmp/CREDENTIALS_COMPLETE.txt', credentialsOutput);
  console.log('🔐 Credenciais salvas em: /tmp/CREDENTIALS_COMPLETE.txt\n');

  // ===== FINAL SUMMARY =====
  console.log('═'.repeat(70));
  console.log('\n✨ BANCO DE DADOS TOTALMENTE POPULADO! ✨\n');
  console.log('═'.repeat(70));
  console.log('\n📊 RESUMO COMPLETO:\n');
  console.log(`   👑 1 SUPER_ADMIN`);
  console.log(`   🏢 ${companies.length} Empresas`);
  console.log(`   👥 ${allUsers.length} Usuários (${companies.length} ADMIN + ${companies.length * 4} USERS)`);
  console.log(`   📋 ${allClients.length} Clientes`);
  console.log(`   ⚖️  ${allCases.length} Processos`);
  console.log(`   👥 ${totalParts} Partes Processuais`);
  console.log(`   📝 ${totalMovements} Movimentações`);
  console.log(`   💰 ${totalTransactions} Transações Financeiras`);
  console.log(`   ⚙️  ${configEntries.length} Configurações de Sistema`);
  console.log('\n═'.repeat(70));
  console.log('\n🌐 Sistema: https://app.advwell.pro');
  console.log('📡 API: https://api.advwell.pro\n');
  console.log('═'.repeat(70));
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
