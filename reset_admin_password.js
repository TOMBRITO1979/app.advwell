const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:RuGc2mfJ8oJW6giog3RiJCBd5qZmWp@localhost:5432/advtom'
});

async function resetPassword() {
  try {
    const email = 'wasolutionscorp@gmail.com';
    const newPassword = 'Teste123!';

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    console.log('✅ Senha resetada com sucesso!');
    console.log(`   Email: ${email}`);
    console.log(`   Nova senha: ${newPassword}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
