const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:RuGc2mfJ8oJW6giog3RiJCBd5qZmWp@postgres:5432/advtom'
});

async function main() {
  try {
    const email = 'admin@advwell.pro';
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Busca primeira empresa
    const company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('❌ Nenhuma empresa encontrada');
      return;
    }

    // Verifica se usuário já existe
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      });
      console.log(`✅ Senha atualizada para: ${email}`);
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Admin AdvWell',
          role: 'SUPER_ADMIN',
          active: true,
          company: {
            connect: { id: company.id }
          }
        }
      });
      console.log(`✅ Usuário criado: ${email}`);
    }

    console.log('\n📋 Credenciais de acesso:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
