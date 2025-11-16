const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:REMOVED_CREDENTIAL@postgres:5432/advtom'
});

async function main() {
  try {
    const email = 'wasolutionscorp@gmail.com';
    const password = 'IbsQ8owApaQ7FSwinmbeTt2wbL3QgD';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    console.log('✅ Senha atualizada com sucesso!');
    console.log('');
    console.log('📋 Suas credenciais:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    console.log('   Empresa: AdvWell');
    console.log('   Role: SUPER_ADMIN');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
