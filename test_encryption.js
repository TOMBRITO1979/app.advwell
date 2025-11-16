// Test Encryption Utility
// Testa se a criptografia está funcionando corretamente

const { encrypt, decrypt, testEncryption, generateEncryptionKey } = require('./backend/dist/utils/encryption');

console.log('🔐 Testando Encryption Utility\n');

// 1. Teste básico
console.log('1️⃣ Teste Básico de Criptografia/Descriptografia');
const testPassword = 'minha-senha-smtp-super-secreta-123!@#';
console.log('   Senha original:', testPassword);

const encrypted = encrypt(testPassword);
console.log('   Senha criptografada:', encrypted);
console.log('   Tamanho criptografado:', encrypted.length, 'caracteres');

const decrypted = decrypt(encrypted);
console.log('   Senha descriptografada:', decrypted);
console.log('   ✅ Correspondência:', testPassword === decrypted ? 'SIM' : 'NÃO');

console.log('');

// 2. Teste com múltiplas senhas
console.log('2️⃣ Teste com Múltiplas Senhas');
const passwords = [
  'senha123',
  'email@password!',
  'super-secure-password-with-special-chars-!@#$%^&*()',
  '12345678',
];

let allPassed = true;
passwords.forEach((pwd, index) => {
  const enc = encrypt(pwd);
  const dec = decrypt(enc);
  const passed = pwd === dec;
  console.log(`   Senha ${index + 1}: ${passed ? '✅' : '❌'}`);
  if (!passed) allPassed = false;
});

console.log('');

// 3. Teste de função integrada
console.log('3️⃣ Teste de Função testEncryption()');
const testResult = testEncryption();
console.log('');

// 4. Gerar chave de criptografia
console.log('4️⃣ Gerar Nova Chave de Criptografia');
const newKey = generateEncryptionKey();
console.log('   Nova chave gerada (64 hex chars = 32 bytes):');
console.log('   ' + newKey);
console.log('   Tamanho:', newKey.length, 'caracteres');
console.log('');

// 5. Resumo
console.log('📊 Resumo dos Testes');
console.log('   Teste básico:', testPassword === decrypted ? '✅ PASSOU' : '❌ FALHOU');
console.log('   Múltiplas senhas:', allPassed ? '✅ PASSOU' : '❌ FALHOU');
console.log('   Função integrada:', testResult ? '✅ PASSOU' : '❌ FALHOU');
console.log('');

if (testPassword === decrypted && allPassed && testResult) {
  console.log('✅ TODOS OS TESTES PASSARAM!');
  console.log('🔒 Encryption utility está funcionando corretamente.');
  process.exit(0);
} else {
  console.log('❌ ALGUNS TESTES FALHARAM!');
  console.log('⚠️  Verifique a implementação da criptografia.');
  process.exit(1);
}
