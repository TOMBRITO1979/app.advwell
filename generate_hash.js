const bcrypt = require('bcrypt');

const password = 'Teste123!';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Erro:', err);
  } else {
    console.log('Senha:', password);
    console.log('Hash:', hash);
  }
});
