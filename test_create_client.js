const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testCreateClient() {
  console.log('🧪 TESTANDO CRIAÇÃO DE CLIENTE\n');

  // Login
  console.log('1. Fazendo login...');
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('✅ Login OK\n');

  // Test 1: Cliente mínimo
  console.log('2. Testando cliente com dados mínimos...');
  try {
    const res = await api.post('/clients', {
      name: 'Teste Simples',
      email: 'teste@teste.com'
    });
    console.log('✅ Cliente criado:', res.data.id);
  } catch (error) {
    console.log('❌ ERRO:', error.response?.data || error.message);
  }

  // Test 2: Cliente completo
  console.log('\n3. Testando cliente com dados completos...');
  try {
    const res = await api.post('/clients', {
      name: 'João da Silva',
      email: 'joao@example.com',
      phone: '21987654321',
      cpfCnpj: '12345678901',
      address: 'Rua Teste, 123'
    });
    console.log('✅ Cliente criado:', res.data.id);
  } catch (error) {
    console.log('❌ ERRO:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
    console.log('Headers:', error.response?.headers);
  }

  // Test 3: Cliente com caracteres especiais
  console.log('\n4. Testando cliente com caracteres especiais...');
  try {
    const res = await api.post('/clients', {
      name: 'José Carlos da Silva Júnior',
      email: 'jose.junior@example.com',
      phone: '(21) 98765-4321',
      cpfCnpj: '123.456.789-01',
      address: 'Rua João Paulo II, 123 - Apt 45'
    });
    console.log('✅ Cliente criado:', res.data.id);
  } catch (error) {
    console.log('❌ ERRO:', error.response?.data || error.message);
  }

  console.log('\n✅ Testes concluídos!');
}

testCreateClient().catch(error => {
  console.error('ERRO FATAL:', error.message);
});
