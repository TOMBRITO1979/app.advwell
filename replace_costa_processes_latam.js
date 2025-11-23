const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista de processos LATAM para cadastrar
const processos = [
  // TJRJ - 8 processos
  {
    processNumber: '0112772-58.2024.8.19.0001',
    court: 'TJRJ',
    subject: 'ANA LUISA VORONOFF DE MEDEIROS vs LATAM',
    notes: 'Comarca da Capital - Cartório da 24ª Vara Cível - Descrição: Remessa'
  },
  {
    processNumber: '0007274-67.2024.8.19.0002',
    court: 'TJRJ',
    subject: 'ALICE HELENA FONTES DE OLIVEIRA SILVA vs LATAM AIRLINES',
    notes: 'Comarca de Niterói - Mediação Pré-processual de Niterói - Descrição: Arquivamento'
  },
  {
    processNumber: '0008253-29.2024.8.19.0002',
    court: 'TJRJ',
    subject: 'CAIO CARIUS VITAL vs LATAM AIRLINES',
    notes: 'Comarca de Niterói - Mediação Pré-processual de Niterói - Descrição: Arquivamento'
  },
  {
    processNumber: '0008112-13.2024.8.19.0001',
    court: 'TJRJ',
    subject: 'MILENA PAULA PEREIRA PASSOS VIEIRA vs LATAM AIRLINES BRASIL',
    notes: 'Comarca da Capital - Centro de Mediação da Capital (Cart Pré-processual) - Descrição: Arquivamento'
  },
  {
    processNumber: '0000733-94.2024.8.19.0203',
    court: 'TJRJ',
    subject: 'ANA LUIZA FONSECA GOMES vs LATAM AIRLINES BRASIL',
    notes: 'Regional de Jacarepaguá - Cartório do Centro de Mediação Pré-processual - Descrição: Arquivamento'
  },
  {
    processNumber: '0002080-13.2025.8.19.0209',
    court: 'TJRJ',
    subject: 'WILLIAN LILIANE SANTANA HOLANDA vs LATAM AIRLINES BRASIL',
    notes: 'Regional da Barra da Tijuca - Cartório da Central de Mediação Pré-processual - Descrição: Arquivamento'
  },
  {
    processNumber: '0002081-95.2025.8.19.0209',
    court: 'TJRJ',
    subject: 'EDUARDO PEREIRA MARTINS vs LATAM AIRLINES BRASIL',
    notes: 'Regional da Barra da Tijuca - Cartório da Central de Mediação Pré-processual - Descrição: Arquivamento'
  },
  {
    processNumber: '0087007-85.2024.8.19.0001',
    court: 'TJRJ',
    subject: 'PATRICIA C MOREIRA vs LATAM AIRLINES GROUP SA',
    notes: 'Comarca da Capital - Centro de Mediação da Capital (Cart Pré-processual) - Descrição: Arquivamento'
  },

  // TJSP - 9 processos
  {
    processNumber: '1506253-50.2020.8.26.0576',
    court: 'TJSP',
    subject: 'Execução Fiscal - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)',
    notes: 'Assunto: Multas e demais Sanções - Unidade 13 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 27/10/2020'
  },
  {
    processNumber: '1000101-09.2021.8.26.0576',
    court: 'TJSP',
    subject: 'Embargos à Execução Fiscal - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)',
    notes: 'Assunto: Inexequibilidade do Título / Inexigibilidade da Obrigação - Unidade 13 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/01/2021'
  },
  {
    processNumber: '1000102-91.2021.8.26.0576',
    court: 'TJSP',
    subject: 'Embargos à Execução Fiscal - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)',
    notes: 'Assunto: Inexequibilidade do Título / Inexigibilidade da Obrigação - Unidade 13 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/01/2021'
  },
  {
    processNumber: '0016910-46.2013.8.26.0229',
    court: 'TJSP',
    subject: 'Execução Fiscal - BT Latam Brasil Ltda.',
    notes: 'Assunto: Dívida Ativa - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 18/12/2013'
  },
  {
    processNumber: '0016909-61.2013.8.26.0229',
    court: 'TJSP',
    subject: 'Execução Fiscal - BT Latam Brasil Ltda.',
    notes: 'Assunto: Dívida Ativa - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 18/12/2013'
  },
  {
    processNumber: '1503044-42.2023.8.26.0229',
    court: 'TJSP',
    subject: 'Execução Fiscal - Sencinet Latam Brasil Ltda',
    notes: 'Assunto: ICMS/ Imposto sobre Circulação de Mercadorias - Foro 3 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 11/09/2023'
  },
  {
    processNumber: '3001454-27.2013.8.26.0642',
    court: 'TJSP',
    subject: 'Execução Fiscal - Medimix Latam Ltda - Epp',
    notes: 'Assunto: FGTS/Fundo de Garantia Por Tempo de Serviço - Foro 6 - Núcleo 4.0 Execuções Fiscais Estaduais - Recebido em: 04/12/2013'
  },
  {
    processNumber: '1131202-50.2025.8.26.0053',
    court: 'TJSP',
    subject: 'Cumprimento de Sentença contra a Fazenda Pública - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)',
    notes: 'Assunto: Fazenda Pública - Foro Central - Fazenda Pública/Acidentes - 6ª Vara de Fazenda Pública - Recebido em: 05/11/2025'
  },
  {
    processNumber: '1126751-79.2025.8.26.0053',
    court: 'TJSP',
    subject: 'Mandado de Segurança Cível - TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)',
    notes: 'Assunto: Suspensão da Exigibilidade - Foro Central - Fazenda Pública/Acidentes - 11ª Vara - Recebido em: 28/10/2025'
  },
];

async function main() {
  try {
    console.log('🔍 Buscando usuário "Administrador - Costa"...');

    // Buscar o usuário pelo nome
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Costa',
          mode: 'insensitive'
        },
        role: 'ADMIN'
      },
      include: {
        company: true
      }
    });

    if (!user) {
      console.error('❌ Usuário "Administrador - Costa" não encontrado!');
      process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.name} (${user.email})`);
    console.log(`   Empresa: ${user.company.name}`);
    console.log(`   CompanyId: ${user.companyId}`);

    const companyId = user.companyId;

    // Deletar processos existentes
    console.log('\n🗑️  Deletando processos existentes...');
    const deletedCases = await prisma.case.deleteMany({
      where: { companyId }
    });
    console.log(`✅ ${deletedCases.count} processos deletados`);

    // Verificar se existe cliente, senão criar um
    console.log('\n👤 Verificando cliente...');
    let client = await prisma.client.findFirst({
      where: { companyId }
    });

    if (!client) {
      console.log('   Criando cliente padrão...');
      client = await prisma.client.create({
        data: {
          companyId,
          name: 'Cliente Padrão - LATAM',
          email: 'cliente@exemplo.com',
          phone: '(21) 99999-9999'
        }
      });
      console.log(`   ✅ Cliente criado: ${client.name}`);
    } else {
      console.log(`   ✅ Cliente existente: ${client.name}`);
    }

    // Cadastrar os processos LATAM
    console.log(`\n📝 Cadastrando ${processos.length} processos LATAM...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const processo of processos) {
      try {
        const newCase = await prisma.case.create({
          data: {
            companyId,
            clientId: client.id,
            processNumber: processo.processNumber,
            court: processo.court,
            subject: processo.subject,
            notes: processo.notes,
            status: 'ACTIVE',
            value: 0
          }
        });

        successCount++;
        console.log(`   ✅ [${successCount}/${processos.length}] ${processo.processNumber} - ${processo.court}`);
        console.log(`      ${processo.subject.substring(0, 60)}...`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Erro ao cadastrar ${processo.processNumber}: ${error.message}`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(70));
    console.log(`Empresa: ${user.company.name}`);
    console.log(`Cliente: ${client.name}`);
    console.log(`Processos deletados: ${deletedCases.count}`);
    console.log(`Processos cadastrados com sucesso: ${successCount}`);
    console.log(`Erros: ${errorCount}`);
    console.log('='.repeat(70));

    // Verificação final
    const totalCases = await prisma.case.count({
      where: { companyId }
    });
    console.log(`\n✅ Total de processos na conta agora: ${totalCases}`);

    // Mostrar distribuição por tribunal
    const casesByTribunal = await prisma.case.groupBy({
      by: ['court'],
      where: { companyId },
      _count: true
    });

    console.log('\n📈 Distribuição por Tribunal:');
    casesByTribunal.forEach(({ court, _count }) => {
      console.log(`   ${court}: ${_count} processos`);
    });

    // Listar todos os processos cadastrados
    console.log('\n📋 Processos cadastrados:');
    const allCases = await prisma.case.findMany({
      where: { companyId },
      orderBy: [
        { court: 'asc' },
        { processNumber: 'asc' }
      ]
    });

    console.log('\n🔵 TJRJ:');
    allCases.filter(c => c.court === 'TJRJ').forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.processNumber}`);
      console.log(`      ${c.subject}`);
    });

    console.log('\n🟢 TJSP:');
    allCases.filter(c => c.court === 'TJSP').forEach((c, index) => {
      console.log(`   ${index + 1}. ${c.processNumber}`);
      console.log(`      ${c.subject}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
