const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    // Buscar todos os processos com suas partes
    const cases = await prisma.case.findMany({
      where: { companyId },
      include: {
        parts: true,
        client: true
      },
      orderBy: { processNumber: 'asc' }
    });

    console.log(`📋 Total de processos: ${cases.length}\n`);
    console.log('👥 Criando clientes a partir dos autores...\n');
    console.log('='.repeat(80));

    let clientsCreated = 0;
    let processesUpdated = 0;
    let errors = 0;

    for (const caseData of cases) {
      try {
        // Encontrar a parte AUTOR
        const autor = caseData.parts.find(p => p.type === 'AUTOR');

        if (!autor) {
          console.log(`⚠️  ${caseData.processNumber} - Sem autor definido, mantendo cliente atual`);
          continue;
        }

        console.log(`\n📄 ${caseData.processNumber}`);
        console.log(`   Autor encontrado: ${autor.name}`);

        // Verificar se já existe um cliente com esse nome
        let client = await prisma.client.findFirst({
          where: {
            companyId,
            name: autor.name
          }
        });

        if (client) {
          console.log(`   ✓ Cliente já existe: ${client.name}`);
        } else {
          // Criar novo cliente baseado nos dados do autor
          client = await prisma.client.create({
            data: {
              companyId,
              name: autor.name,
              cpf: autor.cpfCnpj || null,
              rg: autor.rg || null,
              email: autor.email || null,
              phone: autor.phone || null,
              address: autor.address || null,
              profession: autor.profession || null,
              maritalStatus: autor.civilStatus || null,
              birthDate: autor.birthDate ? new Date(autor.birthDate) : null,
              active: true
            }
          });

          clientsCreated++;
          console.log(`   ✅ Cliente criado: ${client.name}`);
        }

        // Atualizar o processo para vincular ao cliente correto
        if (caseData.clientId !== client.id) {
          await prisma.case.update({
            where: { id: caseData.id },
            data: { clientId: client.id }
          });

          processesUpdated++;
          console.log(`   🔗 Processo vinculado ao cliente: ${client.name}`);
        } else {
          console.log(`   ✓ Processo já vinculado corretamente`);
        }

      } catch (error) {
        errors++;
        console.error(`   ❌ Erro: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO DA OPERAÇÃO\n');
    console.log(`Empresa: ${user.company.name}`);
    console.log(`Processos analisados: ${cases.length}`);
    console.log(`Novos clientes criados: ${clientsCreated}`);
    console.log(`Processos atualizados: ${processesUpdated}`);
    console.log(`Erros: ${errors}`);
    console.log('='.repeat(80));

    // Listar resultado final
    console.log('\n📋 PROCESSOS E CLIENTES VINCULADOS:\n');

    const updatedCases = await prisma.case.findMany({
      where: { companyId },
      include: {
        client: true,
        parts: {
          where: { type: 'AUTOR' }
        }
      },
      orderBy: [
        { court: 'asc' },
        { processNumber: 'asc' }
      ]
    });

    let currentCourt = '';
    updatedCases.forEach((c, index) => {
      if (c.court !== currentCourt) {
        currentCourt = c.court;
        console.log(`\n🔵 ${currentCourt}:`);
      }

      const autor = c.parts[0];
      console.log(`   ${index + 1}. ${c.processNumber}`);
      console.log(`      Cliente: ${c.client.name}`);
      if (autor) {
        console.log(`      Autor: ${autor.name}`);
      }
    });

    // Listar todos os clientes criados
    console.log('\n\n👥 CLIENTES CADASTRADOS:\n');

    const allClients = await prisma.client.findMany({
      where: { companyId },
      include: {
        cases: {
          select: {
            processNumber: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    allClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name}`);
      if (client.cpf) console.log(`   CPF: ${client.cpf}`);
      if (client.email) console.log(`   Email: ${client.email}`);
      if (client.phone) console.log(`   Telefone: ${client.phone}`);
      console.log(`   Processos: ${client.cases.length}`);
      console.log('');
    });

    console.log(`\n✅ Total de clientes cadastrados: ${allClients.length}\n`);

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
