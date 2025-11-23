const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

// Configuração do DataJud
const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';

// Função para buscar processo no DataJud
async function searchCaseInDataJud(processNumber, tribunal) {
  try {
    const cleanNumber = processNumber.replace(/\D/g, ''); // Remove caracteres não numéricos
    const url = `${DATAJUD_BASE_URL}/api_publica_${tribunal.toLowerCase()}/_search`;

    const response = await axios.post(
      url,
      {
        query: {
          match: {
            numeroProcesso: cleanNumber
          }
        }
      },
      {
        headers: {
          Authorization: `ApiKey ${DATAJUD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.hits?.hits?.length > 0;
  } catch (error) {
    return false;
  }
}

// Função para testar processo em todos os tribunais
async function testCaseInAllTribunals(processNumber) {
  const tribunals = ['tjrj', 'tjsp', 'tjmg', 'tjrs', 'tjpr'];

  for (const tribunal of tribunals) {
    const found = await searchCaseInDataJud(processNumber, tribunal);
    if (found) {
      return { found: true, tribunal: tribunal.toUpperCase() };
    }
    // Aguarda 500ms entre requisições para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { found: false, tribunal: null };
}

async function main() {
  try {
    console.log('🔍 Buscando usuário "Administrador - Costa"...\n');

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

    // Buscar todos os processos
    const cases = await prisma.case.findMany({
      where: { companyId },
      orderBy: { court: 'asc' }
    });

    console.log(`📋 Total de processos: ${cases.length}\n`);
    console.log('🔎 Testando processos no DataJud...\n');
    console.log('='.repeat(80));

    const validCases = [];
    const invalidCases = [];

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];
      const progress = `[${i + 1}/${cases.length}]`;

      process.stdout.write(`${progress} Testando ${caseData.processNumber}...`);

      const result = await testCaseInAllTribunals(caseData.processNumber);

      if (result.found) {
        console.log(` ✅ ENCONTRADO (${result.tribunal})`);
        validCases.push(caseData);
      } else {
        console.log(` ❌ NÃO ENCONTRADO`);
        invalidCases.push(caseData);
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 RESULTADO DO TESTE:\n');
    console.log(`✅ Processos encontrados no DataJud: ${validCases.length}`);
    console.log(`❌ Processos NÃO encontrados no DataJud: ${invalidCases.length}\n`);

    if (invalidCases.length === 0) {
      console.log('🎉 Todos os processos foram encontrados no DataJud!');
      console.log('   Nenhum processo será deletado.\n');
      return;
    }

    // Listar processos que serão deletados
    console.log('🗑️  PROCESSOS QUE SERÃO DELETADOS:\n');
    invalidCases.forEach((c, index) => {
      console.log(`${index + 1}. ${c.processNumber} - ${c.court}`);
      console.log(`   ${c.subject}\n`);
    });

    // Deletar processos não encontrados
    console.log('='.repeat(80));
    console.log('⚠️  DELETANDO PROCESSOS NÃO ENCONTRADOS...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const caseData of invalidCases) {
      try {
        await prisma.case.delete({
          where: { id: caseData.id }
        });
        deletedCount++;
        console.log(`✅ Deletado: ${caseData.processNumber}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao deletar ${caseData.processNumber}: ${error.message}`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO FINAL\n');
    console.log(`Empresa: ${user.company.name}`);
    console.log(`Total de processos testados: ${cases.length}`);
    console.log(`Processos válidos (mantidos): ${validCases.length}`);
    console.log(`Processos inválidos (deletados): ${deletedCount}`);
    console.log(`Erros ao deletar: ${errorCount}`);
    console.log('='.repeat(80));

    // Verificação final
    const remainingCases = await prisma.case.count({
      where: { companyId }
    });

    console.log(`\n✅ Total de processos na conta agora: ${remainingCases}\n`);

    // Listar processos que permaneceram
    if (validCases.length > 0) {
      console.log('📋 PROCESSOS QUE PERMANECERAM (encontrados no DataJud):\n');

      const remainingByTribunal = {};
      validCases.forEach(c => {
        if (!remainingByTribunal[c.court]) {
          remainingByTribunal[c.court] = [];
        }
        remainingByTribunal[c.court].push(c);
      });

      Object.keys(remainingByTribunal).sort().forEach(tribunal => {
        console.log(`\n🔵 ${tribunal} (${remainingByTribunal[tribunal].length} processos):`);
        remainingByTribunal[tribunal].forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.processNumber}`);
          console.log(`      ${c.subject.substring(0, 70)}...`);
        });
      });
    }

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
