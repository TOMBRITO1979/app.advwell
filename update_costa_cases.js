const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista de processos para cadastrar
const processos = [
  // TJRJ
  { processNumber: '0012345-67.2023.8.19.0001', court: 'TJRJ', subject: 'João da Silva vs Empresa X Ltda.' },
  { processNumber: '0009876-54.2024.8.19.0002', court: 'TJRJ', subject: 'Maria de Souza vs Município do Rio' },
  { processNumber: '0001122-33.2022.8.19.0003', court: 'TJRJ', subject: 'Ana Paula Farias vs Banco Z S/A' },
  { processNumber: '0055443-21.2021.8.19.0004', court: 'TJRJ', subject: 'Condomínio Y vs Morador Inadimplente' },
  { processNumber: '0109988-77.2023.8.19.0005', court: 'TJRJ', subject: 'Fazenda Pública Estadual vs Contribuinte A' },
  { processNumber: '0030030-01.2024.8.19.0006', court: 'TJRJ', subject: 'Ciclano de Tal vs Operadora de Saúde Beta' },
  { processNumber: '0006789-10.2022.8.19.0007', court: 'TJRJ', subject: 'Instituição de Ensino vs Ex-Aluno' },
  { processNumber: '0123456-78.2023.8.19.0008', court: 'TJRJ', subject: 'Empresa de Transportes vs Passageiro B' },
  { processNumber: '0077665-44.2024.8.19.0009', court: 'TJRJ', subject: 'Empresa de Telefonia Gama vs Cliente C' },
  { processNumber: '0020020-02.2021.8.19.0010', court: 'TJRJ', subject: 'Ministério Público vs Réu Criminal' },

  // TJMG
  { processNumber: '5000100-20.2023.8.13.0024', court: 'TJMG', subject: 'Pedro Henrique Lins vs Concessionária de Energia' },
  { processNumber: '5000200-30.2024.8.13.0030', court: 'TJMG', subject: 'Companhia de Saneamento vs Morador J' },
  { processNumber: '5000300-40.2022.8.13.0035', court: 'TJMG', subject: 'Lúcia Guimarães vs Imobiliária L' },
  { processNumber: '5000400-50.2021.8.13.0040', court: 'TJMG', subject: 'Defensoria Pública vs Estado de MG' },
  { processNumber: '5000500-60.2023.8.13.0042', court: 'TJMG', subject: 'Associação de Moradores vs Empresa K' },
  { processNumber: '5000600-70.2024.8.13.0050', court: 'TJMG', subject: 'Empregado M vs Empresa N' },
  { processNumber: '5000700-80.2022.8.13.0055', court: 'TJMG', subject: 'Transportadora P vs Seguradora Q' },
  { processNumber: '5000800-90.2023.8.13.0060', court: 'TJMG', subject: 'Advogado R vs Cliente S' },
  { processNumber: '5000900-01.2024.8.13.0070', court: 'TJMG', subject: 'Sindicato T vs Empresa U' },
  { processNumber: '5001000-11.2021.8.13.0080', court: 'TJMG', subject: 'Ministério Público vs Prefeito V' },

  // TJSP
  { processNumber: '1000111-22.2023.8.26.0100', court: 'TJSP', subject: 'Paulo Roberto Diniz vs Loja de Eletrodomésticos' },
  { processNumber: '0010203-45.2024.8.26.0001', court: 'TJSP', subject: 'Empresa de Construção Alfa vs Cliente D' },
  { processNumber: '0054321-98.2022.8.26.0002', court: 'TJSP', subject: 'Ricardo Alencar vs Seguradora Y S/A' },
  { processNumber: '0090090-09.2021.8.26.0003', court: 'TJSP', subject: 'Governo do Estado de SP vs Servidor' },
  { processNumber: '1009988-77.2023.8.26.0004', court: 'TJSP', subject: 'Sílvia Mendes vs Companhia Aérea Delta' },
  { processNumber: '0011223-34.2024.8.26.0005', court: 'TJSP', subject: 'Hospital K vs Paciente E' },
  { processNumber: '0050505-05.2022.8.26.0006', court: 'TJSP', subject: 'Empresa de Cobrança F vs Devedor G' },
  { processNumber: '1098765-43.2023.8.26.0007', court: 'TJSP', subject: 'Joana D\'Arc vs Ex-Cônjuge H' },
  { processNumber: '0022110-00.2024.8.26.0008', court: 'TJSP', subject: 'Banco Ômega vs Cliente I' },
  { processNumber: '0044556-67.2021.8.26.0009', court: 'TJSP', subject: 'Indústria Química vs Órgão Ambiental' },
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
          name: 'Cliente Padrão',
          email: 'cliente@exemplo.com',
          phone: '(21) 99999-9999'
        }
      });
      console.log(`   ✅ Cliente criado: ${client.name}`);
    } else {
      console.log(`   ✅ Cliente existente: ${client.name}`);
    }

    // Cadastrar os 30 processos
    console.log(`\n📝 Cadastrando ${processos.length} processos...\n`);

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
            status: 'ACTIVE',
            value: 0
          }
        });

        successCount++;
        console.log(`   ✅ [${successCount}/${processos.length}] ${processo.processNumber} - ${processo.court}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Erro ao cadastrar ${processo.processNumber}: ${error.message}`);
      }
    }

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA OPERAÇÃO');
    console.log('='.repeat(60));
    console.log(`Empresa: ${user.company.name}`);
    console.log(`Cliente: ${client.name}`);
    console.log(`Processos deletados: ${deletedCases.count}`);
    console.log(`Processos cadastrados com sucesso: ${successCount}`);
    console.log(`Erros: ${errorCount}`);
    console.log('='.repeat(60));

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
