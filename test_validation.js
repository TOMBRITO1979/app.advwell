const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.advwell.pro/api',
  httpsAgent: new (require('https')).Agent({ rejectUnauthorized: false })
});

async function testValidation() {
  console.log('🧪 TESTANDO VALIDAÇÃO\n');

  // Login
  const loginRes = await api.post('/auth/login', {
    email: 'admin@costaassociados.adv.br',
    password: 'Teste123!'
  });

  const token = loginRes.data.token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  // Test 1: Todos os campos vazios (como o frontend envia)
  console.log('Test 1: Campos vazios strings...');
  try {
    await api.post('/clients', {
      name: 'Teste',
      cpf: '',
      rg: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      profession: '',
      maritalStatus: '',
      birthDate: '',
      notes: '',
      tag: ''
    });
    console.log('✅ PASSOU!\n');
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Erro:', error.response?.data);
    console.log('');
  }

  // Test 2: Apenas name
  console.log('Test 2: Apenas name...');
  try {
    await api.post('/clients', {
      name: 'Teste 2'
    });
    console.log('✅ PASSOU!\n');
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Erro:', error.response?.data);
    console.log('');
  }

  // Test 3: Name + email vazio
  console.log('Test 3: Name + email vazio...');
  try {
    await api.post('/clients', {
      name: 'Teste 3',
      email: ''
    });
    console.log('✅ PASSOU!\n');
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Erro:', error.response?.data);
    console.log('');
  }

  // Test 4: Name + birthDate vazio
  console.log('Test 4: Name + birthDate vazio...');
  try {
    await api.post('/clients', {
      name: 'Teste 4',
      birthDate: ''
    });
    console.log('✅ PASSOU!\n');
  } catch (error) {
    console.log('❌ FALHOU!');
    console.log('Erro:', error.response?.data);
    console.log('');
  }
}

testValidation().catch(console.error);
