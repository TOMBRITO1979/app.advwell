const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Buscar todos os processos da empresa
    console.log('\n📋 Buscando processos...');
    const cases = await prisma.case.findMany({
      where: { companyId },
      orderBy: { court: 'asc' }
    });

    console.log(`✅ ${cases.count} processos encontrados\n`);

    // Atualizar cada processo removendo "-" e "."
    console.log('🔧 Atualizando números de processo...\n');

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const caseData of cases) {
      const originalNumber = caseData.processNumber;
      const cleanNumber = originalNumber.replace(/[-\.]/g, ''); // Remove "-" e "."

      if (originalNumber === cleanNumber) {
        console.log(`   ⏭️  ${originalNumber} - Já está limpo`);
        unchangedCount++;
        continue;
      }

      try {
        await prisma.case.update({
          where: { id: caseData.id },
          data: { processNumber: cleanNumber }
        });

        updatedCount++;
        console.log(`   ✅ ${originalNumber} → ${cleanNumber}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Erro ao atualizar ${originalNumber}: ${error.message}`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(60));
    console.log(`Empresa: ${user.company.name}`);
    console.log(`Total de processos: ${cases.length}`);
    console.log(`Processos atualizados: ${updatedCount}`);
    console.log(`Processos já corretos: ${unchangedCount}`);
    console.log(`Erros: ${errorCount}`);
    console.log('='.repeat(60));

    // Mostrar alguns exemplos após atualização
    console.log('\n📋 Exemplos de processos após atualização:');
    const updatedCases = await prisma.case.findMany({
      where: { companyId },
      orderBy: { court: 'asc' },
      take: 5
    });

    updatedCases.forEach((c) => {
      console.log(`   ${c.processNumber} - ${c.court} - ${c.subject}`);
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
