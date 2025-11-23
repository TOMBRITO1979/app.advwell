const bcrypt = require('bcrypt');
const { Client } = require('pg');

const PASSWORD = 'Teste123!';

async function resetPasswords() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'advtom',
    user: 'postgres',
    password: 'RuGc2mfJ8oJW6giog3RiJCBd5qZmWp'
  });

  try {
    await client.connect();

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    console.log('Hash gerado:', hashedPassword);

    const emails = [
      'wasolutionscorp@gmail.com',
      'admin@costaassociados.adv.br',
      'admin@mendespereira.com.br',
      'appadvwell@gmail.com',
      'euwrbrito@gmail.com'
    ];

    for (const email of emails) {
      const result = await client.query(
        'UPDATE users SET password = $1 WHERE email = $2 RETURNING email, name, role',
        [hashedPassword, email]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`✅ ${user.email} (${user.name}) - Senha resetada para: ${PASSWORD}`);
      }
    }

    console.log('\n✅ Senhas resetadas com sucesso!');
    console.log(`\nSenha para todos: ${PASSWORD}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

resetPasswords();
