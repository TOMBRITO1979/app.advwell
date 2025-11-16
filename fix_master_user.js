const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:REMOVED_CREDENTIAL@postgres:5432/advtom'
});

async function main() {
  try {
    const userEmail = 'wasolutionscorp@gmail.com';
    
    // Verifica se empresa AdvWell existe
    let company = await prisma.company.findFirst({
      where: { name: 'AdvWell' }
    });

    if (!company) {
      // Cria empresa AdvWell
      company = await prisma.company.create({
        data: {
          name: 'AdvWell',
          email: 'contato@advwell.pro',
          phone: '(11) 99999-9999',
          address: 'Rua Principal, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
          active: true
        }
      });
      console.log('✅ Empresa AdvWell criada:', company.id);
    } else {
      console.log('✅ Empresa AdvWell já existe:', company.id);
    }

    // Atualiza usuário master para associar à empresa
    const user = await prisma.user.update({
      where: { email: userEmail },
      data: {
        company: {
          connect: { id: company.id }
        }
      },
      include: {
        company: true
      }
    });

    console.log('\n✅ Usuário master atualizado com sucesso!');
    console.log('\n📋 Dados do usuário:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Empresa: ${user.company.name}`);
    console.log(`   Empresa ID: ${user.company.id}`);
    console.log('\n🔑 A senha permanece a mesma que você já tinha.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
