const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  try {
    const email = 'appadvwell@gmail.com';
    const password = 'Contadeva123!';
    const name = 'Super Admin - AdvWell';
    const companyName = 'AdvWell Platform Management';

    console.log('🔍 Verificando se o usuário já existe...\n');

    // Verificar se já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  Usuário já existe!');
      console.log('   Email: ' + existingUser.email);
      console.log('   Role: ' + existingUser.role);

      if (existingUser.role !== 'SUPER_ADMIN') {
        console.log('\n🔄 Atualizando role para SUPER_ADMIN...');
        const updated = await prisma.user.update({
          where: { email },
          data: {
            role: 'SUPER_ADMIN',
            password: await bcrypt.hash(password, 10)
          }
        });
        console.log('✅ Usuário atualizado para SUPER_ADMIN!');
      } else {
        console.log('\n🔄 Atualizando senha...');
        await prisma.user.update({
          where: { email },
          data: { password: await bcrypt.hash(password, 10) }
        });
        console.log('✅ Senha atualizada!');
      }
      return;
    }

    console.log('📝 Criando nova conta SUPER_ADMIN...\n');

    // Criar empresa
    const company = await prisma.company.create({
      data: {
        name: companyName,
        email: email,
        active: true,
        apiKey: require('crypto').randomUUID()
      }
    });

    console.log('✅ Empresa criada: ' + company.name);

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário SUPER_ADMIN
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        name: name,
        role: 'SUPER_ADMIN',
        companyId: company.id,
        active: true
      }
    });

    console.log('✅ Usuário SUPER_ADMIN criado!\n');
    console.log('📋 DETALHES DA CONTA:\n');
    console.log('   Email: ' + user.email);
    console.log('   Nome: ' + user.name);
    console.log('   Role: ' + user.role);
    console.log('   Empresa: ' + company.name);
    console.log('   Empresa ID: ' + company.id);
    console.log('   Ativo: Sim\n');

    console.log('🎉 CONTA SUPER_ADMIN CRIADA COM SUCESSO!\n');
    console.log('🔑 CREDENCIAIS:');
    console.log('   Email: ' + email);
    console.log('   Senha: ' + password);
    console.log('\n🌐 Acesse: https://app.advwell.pro\n');
    console.log('⚠️  IMPORTANTE: Esta conta pode:');
    console.log('   • Gerenciar todas as empresas');
    console.log('   • Ativar/desativar empresas');
    console.log('   • Gerenciar todos os usuários');
    console.log('   • Acessar dados de todas as empresas\n');

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
