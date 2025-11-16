const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetPassword() {
  const newPassword = 'Admin@2025';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: 'wasolutionscorp@gmail.com' },
    data: { password: hashedPassword }
  });

  console.log('✅ Senha do Super Admin resetada com sucesso!');
  console.log('Email: wasolutionscorp@gmail.com');
  console.log('Nova senha: Admin@2025');

  await prisma.$disconnect();
}

resetPassword().catch(console.error);
