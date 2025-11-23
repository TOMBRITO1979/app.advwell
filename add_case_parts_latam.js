const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeamento de processos com suas partes
const processosComPartes = [
  // TJRJ - Processos com Requerente vs Requerido
  {
    processNumber: '0112772-58.2024.8.19.0001',
    partes: [
      { type: 'AUTOR', name: 'ANA LUISA VORONOFF DE MEDEIROS' },
      { type: 'REU', name: 'LATAM' }
    ]
  },
  {
    processNumber: '0007274-67.2024.8.19.0002',
    partes: [
      { type: 'AUTOR', name: 'ALICE HELENA FONTES DE OLIVEIRA SILVA' },
      { type: 'REU', name: 'LATAM AIRLINES' }
    ]
  },
  {
    processNumber: '0008253-29.2024.8.19.0002',
    partes: [
      { type: 'AUTOR', name: 'CAIO CARIUS VITAL' },
      { type: 'REU', name: 'LATAM AIRLINES' }
    ]
  },
  {
    processNumber: '0008112-13.2024.8.19.0001',
    partes: [
      { type: 'AUTOR', name: 'MILENA PAULA PEREIRA PASSOS VIEIRA' },
      { type: 'REU', name: 'LATAM AIRLINES BRASIL' }
    ]
  },
  {
    processNumber: '0000733-94.2024.8.19.0203',
    partes: [
      { type: 'AUTOR', name: 'ANA LUIZA FONSECA GOMES' },
      { type: 'REU', name: 'LATAM AIRLINES BRASIL' }
    ]
  },
  {
    processNumber: '0002080-13.2025.8.19.0209',
    partes: [
      { type: 'AUTOR', name: 'WILLIAN LILIANE SANTANA HOLANDA' },
      { type: 'REU', name: 'LATAM AIRLINES BRASIL' }
    ]
  },
  {
    processNumber: '0002081-95.2025.8.19.0209',
    partes: [
      { type: 'AUTOR', name: 'EDUARDO PEREIRA MARTINS' },
      { type: 'REU', name: 'LATAM AIRLINES BRASIL' }
    ]
  },
  {
    processNumber: '0087007-85.2024.8.19.0001',
    partes: [
      { type: 'AUTOR', name: 'PATRICIA C MOREIRA' },
      { type: 'REU', name: 'LATAM AIRLINES GROUP SA' }
    ]
  },

  // TJSP - Execuções Fiscais (Fazenda Pública vs Executado)
  {
    processNumber: '1506253-50.2020.8.26.0576',
    partes: [
      { type: 'AUTOR', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' },
      { type: 'REU', name: 'TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)' }
    ]
  },
  {
    processNumber: '0016910-46.2013.8.26.0229',
    partes: [
      { type: 'AUTOR', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' },
      { type: 'REU', name: 'BT Latam Brasil Ltda.' }
    ]
  },
  {
    processNumber: '0016909-61.2013.8.26.0229',
    partes: [
      { type: 'AUTOR', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' },
      { type: 'REU', name: 'BT Latam Brasil Ltda.' }
    ]
  },
  {
    processNumber: '1503044-42.2023.8.26.0229',
    partes: [
      { type: 'AUTOR', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' },
      { type: 'REU', name: 'Sencinet Latam Brasil Ltda' }
    ]
  },
  {
    processNumber: '3001454-27.2013.8.26.0642',
    partes: [
      { type: 'AUTOR', name: 'UNIÃO FEDERAL (FGTS)' },
      { type: 'REU', name: 'Medimix Latam Ltda - Epp' }
    ]
  },

  // TJSP - Embargos à Execução (Embargante vs Fazenda)
  {
    processNumber: '1000101-09.2021.8.26.0576',
    partes: [
      { type: 'AUTOR', name: 'TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)' },
      { type: 'REU', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' }
    ]
  },
  {
    processNumber: '1000102-91.2021.8.26.0576',
    partes: [
      { type: 'AUTOR', name: 'TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)' },
      { type: 'REU', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' }
    ]
  },

  // TJSP - Cumprimento de Sentença e Mandado de Segurança
  {
    processNumber: '1131202-50.2025.8.26.0053',
    partes: [
      { type: 'AUTOR', name: 'TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)' },
      { type: 'REU', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' }
    ]
  },
  {
    processNumber: '1126751-79.2025.8.26.0053',
    partes: [
      { type: 'AUTOR', name: 'TAM LINHAS AEREAS S/A (LATAM AIRLINES BRASIL)' },
      { type: 'REU', name: 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO' }
    ]
  },
];

async function main() {
  try {
    console.log('🔍 Buscando usuário "Administrador - Costa"...');

    const user = await prisma.user.findFirst({
      where: {
        name: { contains: 'Costa', mode: 'insensitive' },
        role: 'ADMIN'
      },
      include: { company: true }
    });

    if (!user) {
      console.error('❌ Usuário não encontrado!');
      process.exit(1);
    }

    console.log(`✅ Usuário: ${user.name}`);
    console.log(`   Empresa: ${user.company.name}\n`);

    const companyId = user.companyId;

    console.log('📋 Adicionando partes aos processos...\n');

    let totalPartes = 0;
    let processosAtualizados = 0;
    let erros = 0;

    for (const processoInfo of processosComPartes) {
      try {
        // Buscar o processo pelo número
        const processo = await prisma.case.findFirst({
          where: {
            processNumber: processoInfo.processNumber,
            companyId
          }
        });

        if (!processo) {
          console.log(`   ⚠️  Processo não encontrado: ${processoInfo.processNumber}`);
          erros++;
          continue;
        }

        // Deletar partes existentes (se houver)
        await prisma.casePart.deleteMany({
          where: { caseId: processo.id }
        });

        // Adicionar as novas partes
        for (const parte of processoInfo.partes) {
          await prisma.casePart.create({
            data: {
              caseId: processo.id,
              type: parte.type,
              name: parte.name,
              phone: null,
              email: null,
              address: null,
              cpfCnpj: null
            }
          });
          totalPartes++;
        }

        processosAtualizados++;
        const autor = processoInfo.partes.find(p => p.type === 'AUTOR')?.name || '';
        const reu = processoInfo.partes.find(p => p.type === 'REU')?.name || '';

        console.log(`   ✅ ${processoInfo.processNumber}`);
        console.log(`      👤 AUTOR: ${autor}`);
        console.log(`      👤 RÉU: ${reu}\n`);

      } catch (error) {
        console.error(`   ❌ Erro em ${processoInfo.processNumber}: ${error.message}`);
        erros++;
      }
    }

    // Resumo
    console.log('='.repeat(70));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(70));
    console.log(`Processos atualizados com partes: ${processosAtualizados}`);
    console.log(`Total de partes adicionadas: ${totalPartes}`);
    console.log(`Erros: ${erros}`);
    console.log('='.repeat(70));

    // Verificação final - listar alguns processos com suas partes
    console.log('\n📋 Exemplos de processos com partes cadastradas:\n');

    const casesWithParts = await prisma.case.findMany({
      where: { companyId },
      include: {
        parts: true
      },
      take: 5,
      orderBy: { processNumber: 'asc' }
    });

    casesWithParts.forEach((c) => {
      console.log(`📄 ${c.processNumber} - ${c.court}`);
      console.log(`   ${c.subject}`);
      c.parts.forEach((p) => {
        const emoji = p.type === 'AUTOR' ? '👤' : '⚖️';
        console.log(`   ${emoji} ${p.type}: ${p.name}`);
      });
      console.log('');
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
