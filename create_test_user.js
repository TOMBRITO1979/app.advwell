const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash('teste123', 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Priority',
        email: 'teste.priority@advwell.pro',
        password: hashedPassword,
        role: 'ADMIN',
        companyId: 'ae4eb8e8-6cfe-472f-b1d8-9f2ff67c5544', // Mesma empresa
        active: true,
        emailVerified: true,
      },
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Senha: teste123`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
