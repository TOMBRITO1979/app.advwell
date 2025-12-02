const bcrypt = require('bcrypt');

async function main() {
  const passwords = [
    {
      email: 'appadvwell@gmail.com',
      password: 'REMOVED_CREDENTIAL',
      name: 'Super Admin - AdvWell'
    },
    {
      email: 'wasolutionscorp@gmail.com',
      password: 'Admin123!',
      name: 'Super Administrator'
    },
    {
      email: 'admin@costaassociados.adv.br',
      password: 'costa123',
      name: 'Administrador - Costa'
    }
  ];

  console.log('🔑 GERANDO HASHES DAS SENHAS...\n');

  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log('------------------------------------------');
    console.log('Email:', user.email);
    console.log('Nome:', user.name);
    console.log('Senha:', user.password);
    console.log('Hash:', hash);
    console.log('');
    console.log('SQL:');
    console.log(`UPDATE users SET password = '${hash}', "failedLoginAttempts" = 0, "lockoutUntil" = NULL WHERE email = '${user.email}';`);
    console.log('');
  }
}

main().catch(console.error);
